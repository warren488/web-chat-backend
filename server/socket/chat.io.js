let User = require('../models/User');
let Message = require('../models/Message');
const mongoose = require('mongoose');

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
      { token, friendship_id },
      callback
    ) {
      try {
        let user;
        user = await User.findByToken(token);
        activeUsers[socket.id] = {
          userId: user._id.toString(),
          connected: true,
        };
        socket.join(friendship_id);
      } catch (error) {
        console.log(error);
        callback(error, null);
      }
      return callback ? callback(null) : null;
    });

    socket.on('masCheckin', async function masCheckin(
      { token, data: Ids },
      callback
    ) {
      try {
        let user;
        user = await User.findByToken(token);
        activeUsers[socket.id] = {
          userId: user._id.toString(),
          connected: true,
        };
        for (const id of Ids) {
          socket.join(id);
        }
      } catch (error) {
        console.log(error);
        callback(error, null);
      }
      return callback ? callback(null) : null;
    });

    socket.on('gotMessage', async function gotMessage(data, cb) {
      console.log('got message');
      // do an update many and set both statuses (we will get the message(linking) Id)
      message = await Message.updateMany(
        { msgId: data.Ids[2] },
        {
          $set: {
            status: 'received',
          },
        }
      );
      io.to(data.friendship_id).emit('received', {
        friendship_id: data.friendship_id,
        Ids: [data.Ids[1]],
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
        let message = {
          createdAt: new Date().getTime(),
          text: messageData.text,
          from: user.username,
          /** @todo make this change in the schema and start using this instead of username */
          fromId: user._id
        };
        if(messageData.type === "media"){
          message.url = messageData.url;
          message.type = messageData.type;
          message.media = messageData.media;
        }
        if (messageData.hID) {
          let quoted = await Message.findById(messageData.hID);
          if (quoted) {
            message.quoted = quoted;
          }
        }
        let msgId = mongoose.Types.ObjectId();
        // for now we'll use the globally unique identifier to pass back
        // TODO: in very near future we ca pass back both if needed
        let myMsgId = await user.addMessage(messageData.friendship_id, {
          msgId,
          ...message,
        });

        /**
         * @todo search for a user that has a friendship with this friendship id
         * but is not the current user, this will replace an extra query
         */
        // this will actually search by the friendship id
        let { id } = await user.findFriend(messageData.friendship_id, '_id');
        let friend = await User.findById(id);
        let theirMsgId = await friend.addMessage(messageData.friendship_id, {
          msgId,
          ...message,
        });
        io.to(messageData.friendship_id).emit('newMessage', {
          token,
          data: {
            Ids: [theirMsgId, myMsgId, msgId],
            ...message,
            friendship_id: messageData.friendship_id,
          },
        });
        return callback(null, myMsgId);
      } catch (error) {
        console.log(error);
        callback(error, null);
      }
    });

    socket.on('disconnect', (...args) => {
      console.log('disconnect', args);
      delete activeUsers[socket.id];
    });

    socket.on('reconnect', (...args) => {
      console.log('reconnect', args);
    });
  });
  status.attached = true;
};
