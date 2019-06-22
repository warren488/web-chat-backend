let User = require('../models/User')
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
         * on simply for adding the user to the individual chat channel 
         * */ 
        socket.on('checkin', async function checkin({token, friendship_id}, callback) {

            let user
            if (socket.id in activeUsers) {
                // this very much needs to ensure unused sokets are deleted
                // OR that the ids are never reused(idk but unlikely)
                user = await User.findByToken(activeUsers[socket.id])
            } else {
                user = await User.findByToken(token)
                activeUsers[socket.id] = user._id.toString()
            }
            try {
                let chat = await user.findUniqueChat(friendship_id, 'friendship_id')
                if (!chat) {
                    // console.log(chat);
                    chat = await user.startChat({ friendship_id, messages: [] })
                    // console.log(chat);
    
                    // throw ({ message: "chat not found" })
                }
                socket.join(friendship_id)
            } catch (error) {
                console.log(error)
                callback(error, null)
            }
            return callback(null)
        })



        console.log('attaching sendMessage for ', activeUsers[socket.id])
        socket.on('sendMessage', async function sendMessage(messageData, callback) {
            // if this is a socket message about the users is typing then
            // just handle it here
            if (messageData.type === 'typing') {
                io.to(friendship_id).emit('newMessage', messageData)
                return
            }
            let user = await User.findById(activeUsers[socket.id])
            console.log('sendmessage fired: ', messageData);
            try {
                let message = {
                    createdAt: new Date().getTime(),
                    text: messageData.text,
                    from: user.username
                }
                if (messageData.hID) {
                    let quoted = await user.getMessage(friendship_id, messageData.hID)
                    if (quoted) {
                        message.quoted = quoted
                    }
                }
                let msgId = mongoose.Types.ObjectId()
                await user.addMessage(friendship_id, { _id: msgId, ...message });

                // this will actually search by the friendship id
                let { id } = await user.findFriend(friendship_id, '_id')
                let friend = await User.findById(id)
                await friend.addMessage(friendship_id, { _id: msgId, ...message })
                io.to(friendship_id).emit('newMessage', { id: msgId, ...message })
                return callback(null, msgId)

            } catch (error) {
                console.log(error)
                callback(error, null)
            }
        })

        socket.on("disconnect", (args) => {
            console.log(`deleting disconnected socket ${socket.id}`)
            delete activeUsers[socket.id]
        })
    })
    status.attached = true
    console.log(`active users after attachment: `, activeUsers);
    
}