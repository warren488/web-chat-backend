/**
 * @file This file is the main entrypoint and manages all the server setup
 * as well as the routes
 * @author Warren Scantlebury
 * @namespace Server
 */

const path = require("path");
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const apiRouter = require("./api");
const Message = require('./models/Message')
const attachListeners = require("./socket/chat.io");
const bodyParser = require("body-parser");
const { HTMLauthenticate, authenticate, emojis } = require("./services");
const cookieParser = require("cookie-parser");
var hbs = require("hbs");

hbs.registerHelper("equal", 
/**
 * Handlebars helper used to determing wether 2 values are equal or not
 * @function Server.isEqual
 * @param {*} lvalue left hand side value
 * @param {*} rvalue reght hand side value
 * @param {*} type the type of operation
 * @param {*} options additional options
 */
function isEqual(lvalue, rvalue, type, options) {
  if (arguments.length < 3)
    throw new Error("Handlebars Helper equal needs 2 parameters");
  if (type === "not") {
    /**essentially return true if they arent equal */
    if (lvalue == rvalue) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
  }
  if (lvalue != rvalue) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});
require("./db");
const app = express();

app.set("view engine", "hbs");
app.use(bodyParser.json());
app.use(cookieParser());

const publicPath = path.join(__dirname, "../public");
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIO(server);
let status = { attached: false };
const activeUsers = {};

app.use(express.static(publicPath));
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname + "/../views/login.html"));
});
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname + "/../views/signup.html"));
});
app.get("/home", HTMLauthenticate, (req, res) => {
  let friends = req.user.friends.map(({ _id, username }) => ({
    _id,
    username
  }));
  res.render("home.hbs", {
    friends: friends
  });
  // res.sendFile(path.join(__dirname + '/../views/home.hbs'));
});
app.get('/', (req, res) => {
    res.redirect('/home')
})

app.get("/users/me/:friendship_id", HTMLauthenticate, async (req, res) => {
  try {
    let curFriend;
    // TODO: we attach the listeners here because we need reference to some important
    // variables but we only want this function run once for the entire time the server is up
    // so we hack it to only accept one time of listener for each
    attachListeners(io, req.params.friendship_id, activeUsers, status);
    let friends = req.user.friends.map(({ _id, username }) => {
      let returnVal = { _id, username };
      if (_id.toString() === req.params.friendship_id) {
        returnVal.active = true;
        curFriend = username;
      }
      return returnVal;
    });
    /**
     * The messages contained in the current chat between these 2 users
     * @var {Array} currentChat 
     * @memberof Server
     */
    let currentChat = await req.user.getChat(req.params.friendship_id)
    res.render("chat.hbs", {
      friends: friends,
      messages: currentChat,
      username: req.user.username,
      friend: curFriend,
      emojis
    });
    // TODO: this can possible become inefficient
    await Promise.all(currentChat.filter(async message => {
      if(message.from !== req.user.username){
        // update this message's status
        message.status = 'received';
        return Promise.all([Message.findOneAndUpdate({
          // update the status of the other message that corresponds to this 
          // one
          msgId: message.msgId, 
          user_id: {
            $ne: message.user_id
          }
        }, {$set: { status: 'received' }}).then(msg => {
          io.to(req.params.friendship_id).emit('received', [msg._id])
        }),
        message.save()])
      }
      
    }))
  } catch (error) {
    res.send("<h1>ERROR, WORKING TO FIX IT<h1>");
    console.log(error);
  }
});

app.use("/api", apiRouter);

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
