let User = require("../models/User");
let Message = require("../models/Message");
const mongoose = require("mongoose");
const { sendPushMessage, sendPushCallRequest } = require("../services/common");
const Playlist = require("../models/Playlist");
const { createPlaylist } = require("../services");
const async = require("hbs/lib/async");
const ErrorReport = require("../models/ErrorReport");
const Signal = require("../models/Signal");

module.exports = async function ioconnection(io, activeUsers, status) {
  if (status.attached) {
    return;
  }
  io.on("connection", async socket => {
    socket.removeAllListeners()
    // io.clients((err, clients) => {
    //   console.log(err, clients);
    // })

    socket.on("readyForSignals", ({ data: user }) => {
      socket.join(user.id)
      // get missed signals
      Signal.getUserSignals(user.id).then(signals => {
        signals.forEach(signal => {
          if (signal.valid && signal.validUntil > Date.now()) {
            io.to(user.id).emit(signal.eventName, signal.eventData)
          } else if (signal.eventName === "call") {
            io.to(user.id).emit("missedCall", signal.eventData)
          }
        })
      })

    })

    // very important that we use the function parameters ince and then throw them away
    // for any additional processing (or store in global variable)

    /**may need to make this more generic (just for registering user as active) and have
     * one simply for adding the user to the individual chat channel
     * */
    socket.on("checkin", async function checkin(
      { token, friendship_id, userId },
      callback
    ) {
      try {
        let user;
        user = await User.findByToken(token);
        activeUsers[socket.id] = {
          userId: user._id.toString(),
          connected: true
        };
        if (friendship_id) {
          socket.join(friendship_id);
        }
        if (userId) {
          socket.join(userId);
        }
      } catch (error) {
        console.log(error);
        return callback ? callback(error, null) : null;
      }
      return callback ? callback(null) : null;
    });

    socket.on("masCheckin", async function masCheckin(
      { token, data: friendshipLastMessages },
      callback
    ) {
      let user, missedMessages, missedMessagesByChat;
      try {
        user = await User.findByToken(token);
        activeUsers[socket.id] = {
          userId: user._id.toString(),
          connected: true
        };
        let orQuery = [];
        for (const id in friendshipLastMessages) {
          socket.join(id);
          if (friendshipLastMessages[id]) {
            orQuery.push({
              _id: { $ne: { _id: friendshipLastMessages[id]._id } },
              user_id: user._id,
              friendship_id: id,
              createdAt: {
                $gte: parseInt(friendshipLastMessages[id].createdAt)
              }
            });
          }
        }
        if (orQuery.length > 0) {
          missedMessages = await Message.find({ $or: orQuery });
        }
        missedMessagesByChat = {};
        if (missedMessages) {
          /** all message will come in a single array so we need to now separate them
           * back out into chat objects
           */
          for (message of missedMessages) {
            if (!(message.friendship_id in missedMessagesByChat)) {
              missedMessagesByChat[message.friendship_id] = [message];
            } else {
              missedMessagesByChat[message.friendship_id].push(message);
            }
          }
        }
        socket.join(user._id);
      } catch (error) {
        console.log(error);
        return callback ? callback(error, null) : null;
      }
      return callback ? callback(null, missedMessagesByChat) : null;
    });

    socket.on("gotMessage", async function gotMessage(data, cb) {
      // do an update many and set both statuses (we will get the message(linking) Id)
      message = await Message.updateMany(
        { msgId: data.msgId, status: { $ne: "read" } },
        {
          $set: {
            status: data.read ? "read" : "received"
          }
        }
      );
      io.to(data.friendship_id).emit("received", {
        friendship_id: data.friendship_id,
        msgId: data.msgId,
        createdAt: data.createdAt,
        read: data.read
      });
    });

    socket.on("getPlaylists", async function getPlaylists({ token }, cb) {
      try {
        let user = await User.findByToken(token)
        if (!user || !user.playlists || user.playlists.length === 0) {
          return cb(null, [])
        }
        let playlists = await Playlist.getPlaylists(user.playlists)
        cb(null, playlists)
      } catch (error) {
        cb(error)
        console.log(error);

      }
    })
    socket.on("addVideoToPlaylist", async function addVideoToPlaylist({ token, data }, cb) {
      try {
        console.log(data);
        let playlist = await Playlist.addVidToPlaylist(data)
        if (data.friendship_id) {
          io.to(data.friendship_id).emit("playListUpdated", playlist)
        }
        return cb(null, playlist)
      } catch (error) {
        console.log(error);
        cb(error)
      }
    })
    socket.on("clearWatchRequests", async function clearWatchRequests({ token }, cb) {
      try {
        const user = await User.findByToken(token);
        if (user) {
          await user.clearWatchRequests()
        }
        cb(null)
      } catch (err) {
        console.log(err);
        cb({ message: "error clearing watch requests" })
      }
    })
    socket.on("watchSessRequest", async function watchSessRequest({ token, data: watchRequest }, cb) {
      let session = (await mongoose.startSession());
      let playlist, request;
      try {
        await session.startTransaction()
        // TODO: check that all opengraph data is present
        let [user, friend] = await Promise.all([
          User.findByToken(token),
          User.findById(watchRequest.to)
        ])
        if (!watchRequest.playlistId) {
          playlist = await createPlaylist({ user, list: watchRequest, session })
        } else {
          // if the user doesnt have access to it then we want to do this so it will be attached to the request as newplaylist 
          let hasAccess = await friend.hasAccessToPlaylist(watchRequest.playlistId);
          if (!hasAccess) {
            playlist = await Playlist.findById(watchRequest.playlistId)
          }
        }
        // i think we only have to do this if playlist exists
        await friend.addAccessToPlaylist({ id: playlist ? playlist._id : watchRequest.playlistId, session });
        const requestId = mongoose.Types.ObjectId()
        request = {
          _id: requestId,
          playlistId: playlist ? playlist._id : watchRequest.playlistId,
          fromId: user._id,
          createdAt: Date.now(),
          friendship_id: watchRequest.friendship_id
        }
        await Promise.all([
          user.recordWatchRequest({ request, session }),
          friend.recordWatchRequest({ request, session })
        ])
        if (playlist) {
          request.newPlaylist = playlist.toJSON()
        }
        io.to(watchRequest.friendship_id).emit("watchSessRequest", request);
        await session.commitTransaction()
        cb(null, request)

      } catch (error) {
        await session.abortTransaction()
        console.log(error);
        cb(error, null)
      }

    });
    socket.on("acceptWatchRequest", async function acceptWatchRequest({ token, data }, cb) {
      io.to(data.friendship_id).emit("acceptedWatchRequest", data)
      cb(null, true)
    });
    socket.on("pauseVideo", async function pauseVideo({ token, data, sessionUid }, cb) {
      io.to(data.friendship_id).emit("pauseVideo", { ...data, sessionUid })
    });
    socket.on("playVideo", async function playVideo({ token, data, sessionUid }, cb) {
      io.to(data.friendship_id).emit("playVideo", { ...data, sessionUid })
    });
    socket.on("peerIdForCall", async function peerIdForCall({ token, data }, cb) {
      console.log("received peer id for call: " + data.callId);
      Signal.staleSignal(data.callId)
      io.to(data.friendship_id).emit("peerIdForCall", data)
    });
    socket.on("callDeclined", async function callDeclined({ token, data }, cb) {
      console.log("call declined: "+ data.callId);
      Signal.staleSignal(data.callId)
      io.to(data.friendship_id).emit("callDeclined", data)
    });
    socket.on("callBusy", async function callBusy({ token, data }, cb) {
      console.log("call busy: "+ data.callId);
      Signal.inValidateSignal(data.callId)
      io.to(data.friendship_id).emit("callBusy", data)
    });
    socket.on("endCall", async function endCall({ token, data }, cb) {
      console.log("end call: "+ data.callId);
      Signal.inValidateSignal(data.callId)
      io.to(data.friendship_id).emit("endCall", data)
    });
    socket.on("call", async function call({ token, data }, cb) {
      const { userId, friendId, friendship_id, ttl } = data
      const signalId = mongoose.Types.ObjectId()
      console.log("call: "+ signalId);

      const signal = new Signal({
        _id: signalId,
        userId: friendId,
        friendship_id,
        seen: false,
        valid: true,
        validUntil: Date.now() + ttl,
        createdAt: Date.now(),
        eventName: "call",
        eventData: { ...data, _id: signalId }
      })
      await signal.save().then(() => {
        return sendPushCallRequest({ toId: friendId, fromId: userId, friendship_id, _id: signalId })
      })
      io.to(friendship_id).emit("call", { ...data, _id: signalId })
      cb(null, signalId)
    });
    socket.on("nextVideo", async function nextVideo({ token, data, sessionUid }, cb) {
      io.to(data.friendship_id).emit("nextVideo", { ...data, sessionUid })
    });
    socket.on("previousVideo", async function previousVideo({ token, data, sessionUid }, cb) {
      io.to(data.friendship_id).emit("previousVideo", { ...data, sessionUid })
    });

    socket.on("sendMessage", async function sendMessage(
      { token, data: messageData },
      callback
    ) {
      // if this is a socket message about the users is typing then
      // just handle it here
      if (messageData.type === "typing") {
        io.to(messageData.friendship_id).emit("newMessage", {
          token,
          data: messageData
        });
        return;
      }
      let user = await User.findByToken(token);
      try {
        let msgId = mongoose.Types.ObjectId();
        let message = {
          msgId,
          createdAt: new Date().getTime(),
          text: messageData.text,
          from: user.username,
          /** @todo make this change in the schema and start using this instead of username */
          fromId: user._id,
          uuid: messageData.uuid
        };
        if (messageData.type === "media") {
          message.url = messageData.url;
          message.type = messageData.type;
          message.media = messageData.media;
          message.meta = messageData.meta;
        }
        if (messageData.linkPreview) {
          message.linkPreview = messageData.linkPreview;
        }
        if (messageData.hID) {
          /** maybe i can get the _id of the message here so we can potentially
           * speed up the query
           */
          let quoted = await Message.findOne({
            msgId: messageData.hID,
            user_id: user._id,
          });
          if (quoted) {
            message.quoted = quoted;
          }
        }
        let myMsgId = await user.addMessage(messageData.friendship_id, message);

        /**
         * @todo search for a user that has a friendship with this friendship id
         * but is not the current user, this will replace an extra query
         */
        // this will actually search by the friendship id
        let { friendId } = await user.findFriend(
          messageData.friendship_id,
          "_id"
        );
        let friend = await User.findById(friendId);
        let theirMsgId = await friend.addMessage(
          messageData.friendship_id,
          message
        );
        io.to(messageData.friendship_id).emit("newMessage", {
          token,
          data: {
            /** we need to send these here because this message can either go to
             * the receiver or to other device sign in with the senders account
             * therefore they use it to set the _id which is specific to account
             */
            Ids: { senderId: myMsgId, receiverId: theirMsgId },
            ...message,
            friendship_id: messageData.friendship_id
          }
        });
        /** @todo do i really need to wait on this to finish? */
        await sendPushMessage(user, {
          friendship_id: messageData.friendship_id,
          ...message
        });
        /** here we can set _id directly because it goes back to the sending device */
        return callback(null, {
          _id: myMsgId,
          msgId,
          createdAt: message.createdAt
        });
      } catch (error) {
        if (error.code === 11000 && (error.keyPattern.user_id === 1) && (error.keyPattern.uuid === 1)) {
          console.log("we have a dup message");
          const serverTime = new Date().getTime();
          let report = new ErrorReport({
            error: "duplicate message",
            data: {
              ...messageData,
              createdAtString: new Date(messageData.createdAt).toLocaleString({ language: "en", region: "GBR" }),
              serverTimeString: new Date(serverTime).toLocaleString({ language: "en", region: "GBR" }),
              serverTime: serverTime,
              from: user.username + '/' + user._id,
            }
          });
          await report.save();
        } else {
          console.log(error);
          callback(error, null);
        }

      }
    });

    socket.on("disconnect", (...args) => {
      delete activeUsers[socket.id];
    });
  });
  status.attached = true;
};
