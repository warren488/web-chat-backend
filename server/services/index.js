let User = require("../models/User");
let Message = require("../models/Message");
let Event = require("../models/Event");
let EventMeta = require("../models/EventMeta");
let ErrorReport = require("../models/ErrorReport");
const { errorToMessage } = require("./error");
// get our emojis to export through services
const emojis = require("./emoji");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const auth = require("./auth");
const https = require("https");
const cheerio = require("cheerio");
const { getUsers, sendPushFriendRequest } = require("./common");
const Playlist = require("../models/Playlist");
const { uniqueConst } = require("./error/errorAdapters");

async function revokeAllTokens(req, res) {
  await req.user.revokeAllTokens();
  res.status(200).send({ message: "success" });
}

async function generateUserFirebaseToken(req, res) {
  try {
    // if the user was created by us then the mongo id and fbase id are the same anyways so this works
    const firebaseUid = req.user.firebaseUid || req.user._id
    let token = await auth.createCustomToken(firebaseUid.toString());
    res.status(200).send({ message: "successfully generated", token });
  } catch (error) {
    console.log(
      `something went wrong while trying to generate the token`,
      error
    );
  }
}

async function createUser(req, res) {
  try {
    const { user, token } = await User.createNew(req.body);
    return res.status(200).send({ user, token });
  } catch (error) {
    console.log(error);
    let message = errorToMessage(error);
    return res.status(500).send({ userMessage: message });
  }
}

async function updateInfo(req, res) {
  try {
    if (
      !req.body.currentPassword ||
      !bcrypt.compareSync(req.body.currentPassword, req.user.password)
    ) {
      return res.status(401).send({
        message: "must provide current valid password in order to change info",
      });
    }
    if (req.body.newPassword) {
      req.body.password = req.body.newPassword;
    }
    await req.user.updateInfo(req.body);
    res
      .status(200)
      .send({ message: "info updated successfully", user: req.user });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "error occurred" });
  }
}

async function getUsersRequestHandler(req, res) {
  try {
    const { username, user_id, exclude_me, exists } = req.query;
    const userQuery = { username };
    if (exclude_me) {
      userQuery._id = { $ne: req.user._id, $eq: user_id };
    } else {
      userQuery._id = user_id;
    }
    const users = await getUsers(userQuery);
    if (exists) {
      return res.status(200).send({ exists: true });
    }
    return res.status(200).send(users);
  } catch (e) {
    console.log(e);
    if (e.message === "user not found") {
      return res.status(200).send({ exists: false });
    }
    res.status(500).send({ message: "error searching for user" });
  }
}

async function subScribeToPush(req, res) {
  try {
    await req.user.subscribeToNotifs(JSON.stringify(req.body));
    return res.status(200).send({ message: "successfully signed up to push" });
  } catch (error) {
    console.log(error);
  }
}

async function disablePush(req, res) {
  await req.user.disablePush();
  return res.status(200).send({ message: "push successfully disabled" });
}

async function login(req, res) {
  try {
    let user;
    let token;
    // either check for, and reuse the provided token, or check the email and pw (findByCredentials) 
    // and generate a new token
    if (req.body.token) {
      token = req.body.token;
      user = await User.findByToken(req.body.token);
    } else {
      user = await User.findByCredentials("username", req.body);

      token = await user.generateAuthToken();
      // token = await auth.createCustomToken(user.id);
      // user.attachToken(token);
    }

    return res.status(200).send({ token, username: user.username });
  } catch (error) {
    console.log(error);
    if (error.message === "incorrect credentials") {
      return res.status(401).send(error);
    } else if (error.message === "user not found") {
      return res.status(404).send(error);
    }
    return res.status(500).send(error);
  }
}
async function loginWithCustomProvider(req, res) {
  try {
    let user, token;
    if (!req.body.firebaseUid || !req.body.username) {
      // TODO: make sure its a valid firebase uid 
      return res.status(400).send({ message: "insufficient auth data provided" })
    }
    user = await User.findOne({
      firebaseUid: req.body.firebaseUid
    });
    if (user) {
      token = await user.generateAuthToken();
    }
    // if a firebaseuid is provided but doesnt return a user we need to create it 
    else {
      // for some reason i cant get destructuring to work properly 
      try {
        data = await User.createNew(req.body);
        user = data.user
        token = data.token
      } catch (error) {
        // it seems like this error can occur even though we check to see if the user exists (on the frontend)
        // I think this may be the result of some kind of selective case insensitivity in mongo db
        const { found } = uniqueConst(error, 'username');
        console.log('new creation conflict', found);
        if (found) {
          const randString = Math.floor(Math.random() * 1000);
          data = await User.createNew({ ...req.body, username: `${req.body.username}${randString}` });
          user = data.user
          token = data.token
        } else {
          throw error;
        }
      }
    }
    return res.status(200).send({ token, username: user.username });
  } catch (error) {
    console.log(error);
    console.log(uniqueConst(error));
    // the type of stuff that will go in the error to response 
    return res.status(500).send({ message: "error occured, please try again" });
  }
}

async function logout(req, res) {
  let token = req.header("x-auth");
  try {
    await req.user.removeToken(token);
    return res.status(200).send({ message: "logout successful" });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
}

async function authenticate(req, res, next) {
  let token = req.header("x-auth");
  let user;
  try {
    user = await User.findByToken(token);
    if (!user) {
      throw "not found";
    }
  } catch (error) {
    console.log(error);
    return res.status(401).send({ message: "request authentication failed" });
  }
  req.user = user;
  req.token = token;
  next();
}

async function HTMLauthenticate(req, res, next) {
  let token = req.cookies.token;
  let user;
  try {
    if (token) {
      user = await User.findByToken(token);
    }
    if (!user) {
      throw "not found";
    }
  } catch (error) {
    console.log(error);
    return res.redirect(303, "/login");
  }
  req.user = user;
  req.token = token;
  next();
}

async function hasRequestFrom(user1, user2) {
  if (user1.interactions) {
    let result = user1.interactions.receivedRequests.find(
      (request) => user2._id === request.fromId.toString()
    );
    return !!result;
  }
  return false;
}

function addFriend(io) {
  return async function (req, res) {
    try {
      /** we need to check if we have a request from the user that is the ONLY way we have a right to add them as a friend */
      /** we do this here and again later to try to avoid any unecessary trips to DB */
      if (req.body.id && !hasRequestFrom(req.user, { _id: req.body.id })) {
        throw {
          message:
            "you cannot add a user without first receiving a request from them",
        };
      }
      let friend = await User.findOne({
        _id: req.body.id,
      });
      if (!friend) {
        throw { message: "user not found" };
      }

      let { myFriendshipData, friendsFriendshipData } =
        await req.user.addFriend(friend);

      io.to(friend._id.toString()).emit("newFriend", {
        requestAccepted: true,
        friendshipData: friendsFriendshipData,
      });
      io.to(req.user._id).emit("newFriend", {
        friendshipData: myFriendshipData,
      });
      res.status(200).send({ message: "friend successfully added" });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  };
}

function sendFriendRequest(io, sess) {
  return async function (req, res) {
    let requestRecipient, session;
    try {
      session = sess || (await mongoose.startSession());
      await session.startTransaction();
      if (req.user.id === req.body.friendId) return res.status(403).send({ message: "you cannot add yourself" });
      [user, requestRecipient] = await req.user.requestFriend(req.body.friendId, { session });
    } catch (error) {
      console.log(error);
      let message = errorToMessage(error);
      return res.status(500).send({ userMessage: message });
    }

    const sentRequest = requestRecipient.interactions.receivedRequests.find(
      (friendRequest) =>
        friendRequest.fromId.toString() === req.user._id.toString()
    );
    /** below we add the event to the db to serve us later on when the user reloads the page but for right now the
     * 'newFriendRequest' socket message serves as our 'Event' or 'Notification' so we only actually need to send that down
     * I think we will need to consilidate how we handle these situations. Do we want to prioritize always usibg the 'Event system'
     * or prioritize letting things have their own events and the event system take the backfoot
     */
    /**  @nb - if we want to add some additional meta data we can loop the user's request add the request id or something */
    let event = new Event({
      type: "friendRequest",
      createdAt: Date.now(),
      user_id: req.body.friendId,
      meta_reference: {
        _id: sentRequest._id,
      },
    });
    /** do i really want to fail if we dont store this event */
    await event.save({ session });
    await session.commitTransaction();
    await session.endSession();
    io.to(req.body.friendId).emit("newFriendRequest", {
      username: req.user.toJSON().username,
      eventData: event.toJSON(),
      ...(sentRequest.toJSON())
    });
    sendPushFriendRequest({ recipient: { _id: req.body.friendId }, from: req.user })

    res.status(200).send({ message: "friend requested", interactions: user.interactions });
  };
}

async function getFriends(req, res) {
  let myFriendShips = JSON.parse(JSON.stringify(req.user.friends));
  for (const index in myFriendShips) {
    let lastMessage = await req.user.getLastMessage(
      req.user.friends[index]._id
    );
    myFriendShips[index].lastMessage = Array.from(lastMessage);
  }
  myFriendShips.sort((friendshipA, friendshipB) => {
    if (!friendshipB.lastMessage[0]) {
      return -1
    }
    if (!friendshipA.lastMessage[0]) {
      return 1
    }
    return (friendshipB.lastMessage[0].createdAt || 0) - (friendshipA.lastMessage[0].createdAt || 0)
  })
  return res.status(200).send(myFriendShips);
}

async function searchUser(req, res) {
  try {

    // // at lease for the key fields it seems that searching is case sensitive but creation is not
    let user = await User.findOne({
      $or: [{ username: req.query.username }, { username: req.query.username.toLowerCase() }]
    });
    if (user) {
      return res.status(200).send({ exists: true });
    } else {
      return res.status(200).send({ exists: false });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "error searching for user" });
  }
}

async function getUserNotifications(req, res) {
  try {
    let events = await Event.find({
      user_id: req.user.id,
      seen: false,
    });
    splitEvents = {};
    events.forEach((event) => {
      if (!splitEvents[event.type]) {
        splitEvents[event.type] = [];
      }
      splitEvents[event.type].push(event);
    });
    res.status(200).send(splitEvents);
  } catch (e) {
    console.log(e);
    res.status(500).send({ message: "error searching for user" });
  }
}

async function getMe(req, res) {
  let orQuery = [];
  if (req.user.interactions && req.user.interactions.receivedRequests) {
    // build our query to get all users with any of these ids
    for (const friendRequest of req.user.interactions.receivedRequests) {
      orQuery.push({ _id: friendRequest.fromId });
    }
    if (orQuery.length > 0) {
      let requestedUsers = await User.find({ $or: orQuery });
      // build out the new "look" of our interactions.receivedRequests, essentially attaching all user info
      // to those elements of the array
      let filteredRequests = req.user.interactions.receivedRequests.reduce(
        (accumulator, request) => {
          if (request.status !== "denied") {
            requestedUsers.forEach((user) => {
              if (user._id.toString() === request.fromId.toString()) {
                // we do this to get it in a format resembling the user object because we pass the request
                // object to components that take in a user (like profile)
                accumulator.push({
                  ...user.toJSON(),
                  acceptanceStatus: request.status,
                  fromId: request.fromId,
                });
              }
            });
          }
          return accumulator;
        },
        []
      );
      return res.status(200).send({
        ...req.user.toJSON(),
        interactions: {
          sentRequests: req.user.interactions.sentRequests,
          watchRequests: req.user.interactions.watchRequests,
          receivedRequests: filteredRequests,
        },
      });
    }
  }
  res.status(200).send(req.user);
}

async function getMessages(req, res) {
  try {
    let {
      params: { friendship_id },
      query: { limit },
    } = req;
    let currentChat = (
      await req.user.getChat(friendship_id, parseInt(limit))
    ).reverse();
    res.status(200).send(currentChat);
  } catch (e) {
    res.status(500).send({ message: "error retrieving messages" });
  }
}

async function getChatPage(req, res) {
  if (!req.query.limit || !req.query.timestamp) {
    res.status(400).send({
      message:
        "please remember that both the limit and timestamp qparams must be present",
    });
  }
  let currentChat = (
    await req.user.getChatPage({
      friendship_id: req.params.friendship_id,
      limit: parseInt(req.query.limit),
      timestamp: parseInt(req.query.timestamp),
      msgId: req.query.msgId,
    })
  ).reverse();
  return res.status(200).send(currentChat);
}

async function createPlaylist({ userId, user, list, session }) {
  if (!user) {
    user = await User.findById(userId)
  }
  let playlist = new Playlist({ ...list, createdBy: user._id });
  await user.addAccessToPlaylist({ id: playlist._id, session })
  await playlist.save({ session })
  return playlist;
}

const getPromise = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (resp) => {
        let data = "";
        resp.on("data", (chunk) => {
          data += chunk;
        });
        resp.on("end", () => {
          resolve(data);
        });
      })
      .on("error", reject);
  });
};

async function previewLink(req, res) {
  try {
    const url = new URL(req.body.url)
    let urlString = req.body.url;
    if (url.hostname === "youtu.be") {
      urlString = `https://www.youtube.com/watch?v=${url.pathname.substring(1)}`
    }
    const html = await getPromise(urlString);
    const $ = cheerio.load(html);
    const getMetaRag = (name) => {
      return (
        $(`meta[name=${name}]`).attr("content") ||
        $(`meta[name="og:${name}"]`).attr("content") ||
        $(`meta[name="twitter:${name}"]`).attr("content") ||
        $(`meta[property=${name}]`).attr("content") ||
        $(`meta[property="og:${name}"]`).attr("content") ||
        $(`meta[property="twitter:${name}"]`).attr("content") ||
        $(`meta[itemprop="${name}"]`).attr("content")
      );
    };
    let data = {
      title: getMetaRag("title"),
      image: getMetaRag("image"),
      description: getMetaRag("description"),
      url: req.body.url,
      id: req.body.id,
    };
    return res.status(200).send(data);
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: "error" });
  }
}

async function getLastMessage(req, res) {
  let lastMessage = await req.user.getLastMessage(req.params.friendship_id);
  return res.status(200).send(lastMessage);
}

/**
 * ============================================================================
 * FUNCTIONS THAT DEAL WITH BOTH THE SOCKET AND THE HTTP API
 */

/**
 * for a user mark all messages between 2 timestamps as read
 */
function sweep(io) {
  return async (req, res) => {
    /**
     * can be expensive if we end up getting a lot of messages, especially those that have already
     * been marked as read
     */

    try {
      let { friendship_id, range, read } = req.body;
      let info = await Message.markAsReceived({
        friendship_id,
        range,
        fromId: req.user._id,
        read,
      });
      res.status(200).send({ message: "success" });
      io.to(friendship_id).emit("sweep", {
        range,
        friendship_id,
        fromId: req.user._id,
        read,
      });
      return;
    } catch (e) {
      res.status(500).send({ message: "error retrieving messages" });
    }
  };
}

function clearNotifType(io) {
  /** we actually dont really need io here except for
   * updating if the user is logged in on multiple devices
   */
  return async (req, res) => {
    const { type, timestamp } = req.body;
    await Event.clearAllNotifsOfType({ type, timestamp, user_id: req.user.id });
    res.status(200).send({ message: "success" });
    io.to(req.user.id).emit("clearnotiftype", { type, timestamp });
  };
}

async function crashReport(req, res) {
  let error = req.body.error;
  if (typeof req.body.error === "object") {
    error = JSON.stringify(req.body.error);
  }
  let report = new ErrorReport({ ...req.body, error });
  await report.save();

  res.send();
}

module.exports = {
  getChatPage,
  generateUserFirebaseToken,
  getLastMessage,
  getFriends,
  getMessages,
  createUser,
  login,
  loginWithCustomProvider,
  subScribeToPush,
  revokeAllTokens,
  crashReport,
  logout,
  getMe,
  sweep,
  getUsersRequestHandler,
  previewLink,
  emojis,
  disablePush,
  sendFriendRequest,
  updateInfo,
  authenticate,
  HTMLauthenticate,
  getUserNotifications,
  addFriend,
  clearNotifType,
  searchUser,
  createPlaylist,
};
