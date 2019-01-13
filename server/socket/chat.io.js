let User = require('../models/User')

module.exports = async function (io, friendship_id, user, activeUsers) {
    io.on("connection", async socket => {

        activeUsers[socket.id] = user._id.toString()
        let chat = await user.findUniqueChat(friendship_id, 'friendship_id')
        if (!chat) {
            throw ({ message: "chat not found" })
        }
        socket.join(friendship_id)


        socket.on('sendMessage', async (messageData, callback) => {

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
                let msgId = await user.addMessage(friendship_id, message);

                // this will actually search by the friendship id
                let { id } = await user.findFriend(friendship_id, '_id')
                let friend = await User.findById(id)
                await friend.addMessage(friendship_id, message)
                io.to(friendship_id).emit('newMessage', { id: msgId, ...message })
                callback()
                return
            } catch (error) {
                console.log(error)
            }
        })
    })

}