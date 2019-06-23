let User = require('../models/User')
let Message = require('../models/Message')
const mongoose = require("mongoose")

module.exports = async function ioconnection(io, friendship_id, activeUsers, status) {
    if(status.attached){
        return
    }
    io.on("connection", async socket => {
        console.log(`new socket ${socket.id}, active users`, activeUsers);
        
        // very important that we use the function parameters ince and then throw them away
        // for any additional processing (or store in global variable)


        /**may need to make this more generic (just for registering user as active) and have
         * one simply for adding the user to the individual chat channel 
         * */ 
        socket.on('checkin', async function checkin({token, friendship_id}, callback) {
            try {
                let user
                if (socket.id in activeUsers) {
                    // this very much needs to ensure unused sokets are deleted
                    // OR that the ids are never reused(idk but unlikely)
                    user = await User.findById(activeUsers[socket.id])
                } else {
                    user = await User.findByToken(token)
                    activeUsers[socket.id] = user._id.toString()
                }
                socket.join(friendship_id)
            } catch (error) {
                console.log(error)
                callback(error, null)
            }
            return callback(null)
        })

        socket.on('gotMessage', async function gotMessage(data, cb){
            // do an update many and set both statuses (we will get the message(linking) Id)
            message = await Message.updateMany({msgId: data.Ids[2]}, {
                $set: {
                    status: 'received'
                }
            })
            io.to(friendship_id).emit('received', [data.Ids[1]])
        })


        socket.on('sendMessage', async function sendMessage(messageData, callback) {
            // if this is a socket message about the users is typing then
            // just handle it here
            if (messageData.type === 'typing') {
                io.to(friendship_id).emit('newMessage', messageData)
                return
            }
            let user = await User.findById(activeUsers[socket.id])
            try {
                let message = {
                    createdAt: new Date().getTime(),
                    text: messageData.text,
                    from: user.username
                }
                if (messageData.hID) {
                    
                    let quoted = await Message.findById(messageData.hID)
                    if (quoted) {
                        message.quoted = quoted
                    }
                }
                let msgId = mongoose.Types.ObjectId()
                // for now we'll use the globally unique identifier to pass back
                // TODO: in very near future we ca pass back both if needed
                let myMsgId = await user.addMessage(friendship_id, { msgId, ...message });

                // this will actually search by the friendship id
                let { id } = await user.findFriend(friendship_id, '_id')
                let friend = await User.findById(id)
                let theirMsgId = await friend.addMessage(friendship_id, { msgId, ...message })
                io.to(friendship_id).emit('newMessage', { Ids: [theirMsgId, myMsgId, msgId], ...message })
                return callback(null, myMsgId)

            } catch (error) {
                console.log(error)
                callback(error, null)
            }
        })

        socket.on("disconnect", (args) => {
            delete activeUsers[socket.id]
        })
    })
    status.attached = true
    
}