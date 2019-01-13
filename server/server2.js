const path = require('path');
const http = require('http')
const express = require('express');
const socketIO = require("socket.io")
const apiRouter = require("./api")
const attachListeners = require('./socket/chat.io')
const bodyParser = require("body-parser")
const { HTMLauthenticate, authenticate } = require('./services')
const cookieParser = require('cookie-parser')
var hbs = require('hbs');
require('./db')
const app = express();

app.set('view engine', 'hbs');
app.use(bodyParser.json())
app.use(cookieParser())

const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
const server = http.createServer(app)
const io = socketIO(server)
const activeUsers = {}

app.use(express.static(publicPath));
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname + '/../views/login.html'));
})
app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname + '/../views/signup.html'));
})
app.get('/home', HTMLauthenticate, (req, res) => {
  let friends = req.user.friends.map(({ _id, username }) => ({ _id, username }))
  res.render('home.hbs', {
    friends: friends
  })
  // res.sendFile(path.join(__dirname + '/../views/home.hbs'));
})

app.get('/users/me/:friendship_id', HTMLauthenticate, async (req, res) => {
  attachListeners(io, req.params.friendship_id, req.user, activeUsers)
  let friends = req.user.friends.map(({ _id, username }) => {
    let returnVal = { _id, username }
    if (_id.toString() === req.params.friendship_id) {
      returnVal.active = true
    }
    return returnVal
  })
  let { messages } = await req.user.findUniqueChat(req.params.friendship_id, 'friendship_id')
  res.render('chat.hbs', {
    friends: friends,
    messages
  })
})

app.use('/api', apiRouter)

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});


