let User = require('../models/User');
let Message = require('../models/Message');
const mongoose = require('mongoose');
const { sendPushMessage } = require('../services/common');

module.exports = async function ioconnection(io, activeUsers, status) {
  if (status.attached) {
    return;
  }
  io.on('connection', async (socket) => {
    console.log(`new socket ${socket.id}, active users`, activeUsers);

    // very important that we use the function parameters ince and then throw them away
    // for any additional processing (or store in global variable)

    /**may need to make this more generic (just for registering user as active) and have
     * one simply for adding the user to the individual chat channel
     * */

    socket.on('checkin', async function checkin(
      { token, friendship_id, userId },
      callback
    ) {
      try {
        let user;
        user = await User.findByToken(token);
        activeUsers[socket.id] = {
          userId: user._id.toString(),
          connected: true,
        };
        if(friendship_id) {
          socket.join(friendship_id);
        }
        if(userId) {
          socket.join(userId)
        }
      } catch (error) {
        console.log(error);
        callback(error, null);
      }
      return callback ? callback(null) : null;
    });

    socket.on('masCheckin', async function masCheckin(
      { token, data: friendshipLastMessages },
      callback
      ) {
        console.log('masCheckin', friendshipLastMessages);
      let user, missedMessages, missedMessagesByChat;
      try {
        user = await User.findByToken(token);
        activeUsers[socket.id] = {
          userId: user._id.toString(),
          connected: true,
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
                $gte: parseInt(friendshipLastMessages[id].createdAt),
              },
            });
          }
        }
        if (orQuery.length > 0) {
          missedMessages = await Message.find({ $or: orQuery });
        }
        missedMessagesByChat = {};
        if(missedMessages){
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
        return callback ? callback(error, null): null;
      }
      console.log('mascheckin', missedMessagesByChat);
      return callback ? callback(null, missedMessagesByChat) : null;
    });

    socket.on('gotMessage', async function gotMessage(data, cb) {
      // do an update many and set both statuses (we will get the message(linking) Id)
      message = await Message.updateMany(
        { msgId: data.msgId, status: { $ne: 'read' } },
        {
          $set: {
            status: data.read ? 'read' : 'received',
          },
        }
      );
      io.to(data.friendship_id).emit('received', {
        friendship_id: data.friendship_id,
        msgId: data.msgId,
        createdAt: data.createdAt,
        read: data.read
      });
    });

    socket.on('sendMessage', async function sendMessage(
      { token, data: messageData },
      callback
    ) {
      // if this is a socket message about the users is typing then
      // just handle it here
      if (messageData.type === 'typing') {
        io.to(messageData.friendship_id).emit('newMessage', {
          token,
          data: messageData,
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
        };
        if (messageData.type === 'media') {
          message.url = messageData.url;
          message.type = messageData.type;
          message.media = messageData.media;
          message.meta = messageData.meta;
        }
        if(messageData.linkPreview){
          message.linkPreview = messageData.linkPreview;
        }
        if (messageData.hID) {
          let quoted = await Message.find({ msgId: messageData.hID, user_id: user._id });
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
        let { friendId } = await user.findFriend(messageData.friendship_id, '_id');
        let friend = await User.findById(friendId);
        let theirMsgId = await friend.addMessage(messageData.friendship_id, message);
        io.to(messageData.friendship_id).emit('newMessage', {
          token,
          data: {
            /** we need to send these here because this message can either go to
             * the receiver or to other device sign in with the senders account
             * therefore they use it to set the _id which is specific to account
             */
            Ids: {senderId: myMsgId, receiverId: theirMsgId},
            ...message,
            friendship_id: messageData.friendship_id,
          },
        });
        /** @todo do i really need to wait on this to finish? */
        await sendPushMessage(user, { friendship_id: messageData.friendship_id, ...message });
        /** here we can set _id directly because it goes back to the sending device */
        return callback(null, { _id: myMsgId, msgId, createdAt: message.createdAt });
      } catch (error) {
        console.log(error);
        callback(error, null);
      }
    });

    socket.on('disconnect', (...args) => {
      delete activeUsers[socket.id];
    });
  });
  status.attached = true;
};
