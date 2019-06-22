const path = require("path");
const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
const apiRouter = require("./api");
const attachListeners = require("./socket/chat.io");
const bodyParser = require("body-parser");
const { HTMLauthenticate, authenticate, emojis } = require("./services");
const cookieParser = require("cookie-parser");
var hbs = require("hbs");
/**
 * @param type - used to determine wether we are doing == or !=
 */
hbs.registerHelper("equal", function(lvalue, rvalue, type, options) {
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
    let currentChat = await req.user.findUniqueChat(
      req.params.friendship_id,
      "friendship_id"
    );
    if (!currentChat) {
      currentChat = await req.user.startChat({
        friendship_id: req.params.friendship_id,
        messages: []
      });
    }
    res.render("chat.hbs", {
      friends: friends,
      messages: currentChat.messages,
      username: req.user.username,
      friend: curFriend,
      emojis
    });
  } catch (error) {
    res.send("<h1>ERROR, WORKING TO FIX IT<h1>");
    console.log(error);
  }
});

app.use("/api", apiRouter);

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});
