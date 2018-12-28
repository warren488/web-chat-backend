const path = require('path');
const http = require('http')
const express = require('express');
const socketIO = require("socket.io")

const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
let app = express();
let server = http.createServer(app)
let io = socketIO(server)
let users = []

io.on("connection", (socket) => {
  console.log('new user connected');
  socket.on('sendMessage', (messageData) => {
    console.log('send message emitted');

    io.emit('newMessage', { createdAt: new Date().toLocaleTimeString(), ...messageData })

  })

  socket.on('startChat', ({name}) => {
    users.push(name)
    io.emit('addusername', users)
  })
})


io.on("disconnect", () => {
  console.log('user disconnected');
  // users.join(" ")
  // users.replace()
})




app.use(express.static(publicPath));

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
