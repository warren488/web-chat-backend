let User = require('../models/User');
let Message = require('../models/Message');
let ErrorReport = require('../models/ErrorReport');
const { errorToMessage } = require('./error');
// get our emojis to export through services
const emojis = require('./emoji');
const bcrypt = require('bcryptjs');
const auth = require('./auth');

async function revokeAllTokens(req, res) {
  await req.user.revokeAllTokens();
  res.status(200).send({ message: 'success' });
}

async function generateUserFirebaseToken(req, res) {
  try {
    let token = await auth.createCustomToken(req.user._id.toString());
    res.status(200).send({ message: 'successfully generated', token });
  } catch (error) {
    console.log(
      `something went wrong while trying to generate the token`,
      error
    );
  }
}

async function createUser(req, res) {
  try {
    // await User.schema.methods.validateSchema(req.body)
    let user = new User({ ...req.body, chats: [], interactions: {receivedRequests: [], sentRequests: []} });

    let token = await user.generateAuthToken();
    // let token = await auth.createCustomToken(user.id);
    // await user.attachToken(token);
    user = await user.save();
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
        message: 'must provide current valid password in order to change info',
      });
    }
    if (req.body.newPassword) {
      req.body.password = req.body.newPassword;
    }
    await req.user.updateInfo(req.body);
    res
      .status(200)
      .send({ message: 'info updated successfully', user: req.user });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: 'error occurred' });
  }
}

async function getUsers(req, res) {
  const users = await User.filterByUsername(req.user._id, req.query.username);

  return res.status(200).send(users);
}

async function subScribeToPush(req, res) {
  try {
    await req.user.subscribeToNotifs(JSON.stringify(req.body));
    return res.status(200).send({ message: 'successfully signed up to push' });
  } catch (error) {
    console.log(error);
  }
}

async function disablePush(req, res) {
  await req.user.disablePush();
  return res.status(200).send({ message: 'push successfully disabled' });
}

async function login(req, res) {
  try {
    let user;
    let token;
    if (req.body.token) {
      token = req.body.token;
      user = await User.findByToken(req.body.token);
    } else {
      user = await User.findByCredentials('username', req.body);

      token = await user.generateAuthToken();
      // token = await auth.createCustomToken(user.id);
      // user.attachToken(token);
    }

    return res.status(200).send({ token, username: user.username });
  } catch (error) {
    console.log(error);
    if (error.message === 'incorrect credentials') {
      return res.status(401).send(error);
    } else if (error.message === 'user not found') {
      return res.status(404).send(error);
    }
    return res.status(500).send(error);
  }
}

async function logout(req, res) {
  let token = req.header('x-auth');
  try {
    await req.user.removeToken(token);
    return res.status(200).send({ message: 'logout successful' });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
}

async function authenticate(req, res, next) {
  let token = req.header('x-auth');
  let user;
  try {
    user = await User.findByToken(token);
    if (!user) {
      throw 'not found';
    }
  } catch (error) {
    console.log(error);
    return res.status(401).send({ message: 'request authentication failed' });
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
      throw 'not found';
    }
  } catch (error) {
    console.log(error);
    return res.redirect(303, '/login');
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
            'you cannot add a user without first receiving a request from them',
        };
      }
      let friend = await User.findOne({
        username: req.body.username,
      });
      if (!friend) {
        throw { message: 'user not found' };
      }
      if (
        req.body.id &&
        !hasRequestFrom(req.user, { _id: friend._id.toString() })
      ) {
        throw {
          message:
            'you cannot add a user without first receiving a request from them',
        };
      }

      let newFriendshipData = await req.user.addFriend(friend);
      /** mongo does some fancy magic with their object that causes them not to quite behave regularly */

      req.user.interactions.receivedRequests = req.user.interactions.receivedRequests.filter(
        (request) => request.fromId.toString() !== friend._id.toString()
      );
      friend.interactions.sentRequests = friend.interactions.sentRequests.filter(
        (request) => request.userId.toString() !== req.user._id.toString()
      );
      /** these custom functions also save the document hence i dont need to save friend */
      let [friendsFriendshipData] = await Promise.all([
        friend.reAddFriend({
          ...req.user.toJSON(),
          friendship_id: newFriendshipData._id,
        }),
        req.user.save(),
      ]);
      io.to(friend._id.toString()).emit('newFriend', {
        requestAccepted: true,
        friendshipData: friendsFriendshipData,
      });
      io.to(req.user._id).emit('newFriend', {
        friendshipData: newFriendshipData,
      });
      res.status(200).send({ message: 'friend successfully added' });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  };
}

function sendFriendRequest(io) {
  return async function (req, res) {
    try {
      await req.user.requestFriend(req.body.friendId);
    } catch (error) {
      console.log(error);
      let message = errorToMessage(error);
      return res.status(500).send({ userMessage: message });
    }
    io.to(req.body.friendId).emit('newFriendRequest', {
      username: req.user.username,
      /** so this gets duplicated because depending on the use case it checks different properties
       * this data can be placed in a profile where it acts like profile data while having to simultaneously
       * (somewhere else in the app) act like the simple interaction it is
       */
      fromId: req.user._id,
      id: req.user._id,
      acceptanceStatus: 'pending',
    });
    res.status(200).send({ message: 'friend requested' });
  };
}

async function getFriends(req, res) {
  let myFriends = JSON.parse(JSON.stringify(req.user.friends));
  for (const index in myFriends) {
    let lastMessage = await req.user.getLastMessage(
      req.user.friends[index]._id
    );
    myFriends[index].lastMessage = Array.from(lastMessage);
  }
  return res.status(200).send(myFriends);
}

async function getUser(req, res) {
  try {
    let user = await User.findByUsername(req.params.username);
    if (req.query.exists) {
      return res.status(200).send({ exists: true });
    }
    res.status(200).send(user);
  } catch (e) {
    console.log(e);
    if (e.message === 'user not found') {
      return res.status(200).send({ exists: false });
    }
    res.status(500).send({ message: 'error searching for user' });
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
          if (request.status !== 'denied') {
            requestedUsers.forEach((user) => {
              if (user._id.toString() === request.fromId.toString()) {
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
          receivedRequests: filteredRequests,
        },
      });
    }
  }
  res.status(200).send(req.user);
}

// TODO: eventually remove after the frontend uses direct links
async function chatRedirect(req, res) {
  fid = req.body.friendship_id.toString();
  return res.status(278).send({ redirect: '/users/me/' + fid });
}

async function getMessages(req, res) {
  try {
    let {
      params: { friendship_id },
      query: { limit },
    } = req;
    let currentChat = (await req.user.getChat(friendship_id, parseInt(limit))).reverse();
    res.status(200).send(currentChat);
  } catch (e) {
    res.status(500).send({ message: 'error retrieving messages' });
  }
}

async function getChatPage(req, res) {
  if (!req.query.limit || !req.query.timestamp) {
    res.status(400).send({
      message:
        'please remember that both the limit and timestamp qparams must be present',
    });
  }
  let currentChat = (await req.user.getChatPage(
    req.params.friendship_id,
    parseInt(req.query.limit),
    parseInt(req.query.timestamp)
  )).reverse();
  return res.status(200).send(currentChat);
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
      let { friendship_id, range } = req.body;
      let info = await Message.markAsReceived(
        friendship_id,
        range,
        req.user.username
      );
      res.status(200).send({ message: 'success' });
      io.to(friendship_id).emit('sweep', {
        range,
        friendship_id,
        fromId: req.user._id,
      });
      return;
    } catch (e) {
      res.status(500).send({ message: 'error retrieving messages' });
    }
  };
}

async function crashReport(req, res){
  let error = req.body.error;
  if(typeof req.body.error === "object"){
    error = JSON.stringify(req.body.error)
  }
  let report = new ErrorReport({...req.body, error});
  await report.save();

  res.send();
}

async function imageUpload(req, res) {
  // try {
  //   // Create a root reference
  //   var storageRef = firebase.storage().ref();
  //   // Create a reference to 'images/mountains.jpg'
  //   var ref = storageRef.child('profileImages/mountains.jpg');
  //   await ref.putString(req.body.imageData, 'data_url').then(function (snapshot) {
  //     console.log('Uploaded a base64 string!');
  //     res.status(200).send(true)
  //   });
  // } catch (error) {
  //   console.log(error);
  // }
}

module.exports = {
  getChatPage,
  generateUserFirebaseToken,
  getLastMessage,
  getFriends,
  chatRedirect,
  getMessages,
  createUser,
  login,
  subScribeToPush,
  revokeAllTokens,
  crashReport,
  logout,
  imageUpload,
  getMe,
  sweep,
  getUsers,
  emojis,
  disablePush,
  logout,
  sendFriendRequest,
  updateInfo,
  authenticate,
  HTMLauthenticate,
  addFriend,
  getUser,
};
