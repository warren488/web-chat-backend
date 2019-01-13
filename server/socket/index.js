
const ChatRoom = require('../ChatRoom')
const {isString} = require('../../utils')

module.exports = function (io) {
    let rooms = {}
    let messages = []

    io.on("connection", (socket) => {
        console.log('new user connected');
        socket.on('sendMessage', (messageData, callback) => {
            console.log(rooms);

            for (const key in rooms) {
                console.log(rooms[key]);

                if (rooms.hasOwnProperty(key)) {
                    const room = rooms[key];
                    let user = room.getUser(socket.id)
                    if (user !== null) {
                        let message = {
                            createdAt: new Date().getTime(),
                            text: messageData.text,
                            name: user.name
                        }
                        if (messageData.hID && messages[parseInt(messageData.hID)]) {
                            message.quoted = messages[parseInt(messageData.hID)]
                        }
                        let index = messages.push(message) - 1;
                        io.to(key).emit('newMessage', { id: index, ...message })
                        callback()
                        return
                    }
                }
            }
            // io.emit('newMessage', { createdAt: new Date().getTime(), ...messageData })
            // callback()
        })

        socket.on('join', (params, callback) => {
            console.log('join emitted');

            if (isString(params.name) && isString(params.room)) {
                socket.join(params.room)

                if (params.room in rooms) {
                    rooms[params.room].addUser(socket.id, params.name)
                } else {
                    rooms[params.room] = new ChatRoom(params.room)
                    rooms[params.room].addUser(socket.id, params.name)
                }
                io.to(params.room).emit('updateUList', rooms[params.room].getUsers())
                socket.emit('newMessage',
                    {
                        createdAt: new Date().getTime(),
                        text: 'Welcome to the chat app',
                        name: 'Admin'
                    })
                socket.broadcast.to(params.room).emit('newMessage',
                    {
                        createdAt: new Date().getTime(),
                        text: `${params.name} just joined the chat room`,
                        name: 'Admin'
                    })
                return
            }
            callback('invalid room or name')
        })

        socket.on("disconnect", (args) => {
            // console.log(rooms.private);
            for (const key in rooms) {
                if (rooms[key].getUser(socket.id) !== null) {
                    let { name } = rooms[key].removeUser(socket.id)
                    io.to(key).emit('newMessage', {
                        createdAt: new Date().getTime(),
                        text: `${name} has left the chat`,
                        name: 'Admin'
                    })
                    console.log(rooms[key]);
                    io.to(key).emit('updateUList', rooms[key].getUsers())
                }
            }
            // console.log(rooms.private);

            console.log('user disconnected');

        })
    })

}
