let User = require('../models/User');
let Message = require('../models/Message');
// get our emojis to export through services
const emojis = require('./emoji');
const bcrypt = require('bcryptjs');


// const firebase = require('firebase/app');

// // These imports load individual services into the firebase namespace.
// require('firebase/storage');
// var firebaseConfig = {
//   apiKey: 'AIzaSyBD4TjGeZXKw7fWYR8X0UGfHAIvQqzUmF0',
//   authDomain: 'myapp-4f894.firebaseapp.com',
//   databaseURL: 'https://myapp-4f894.firebaseio.com',
//   projectId: 'myapp-4f894',
//   storageBucket: 'myapp-4f894.appspot.com',
//   messagingSenderId: '410181839308',
//   appId: '1:410181839308:web:7249de84cc8fdd3cc5d569',
// };
// // Initialize Firebase
// firebase.initializeApp(firebaseConfig);

/* ====================================================================== */

async function createUser(req, res) {
  try {
    // await User.schema.methods.validateSchema(req.body)
    let user = new User({ ...req.body, chats: [] });

    let token = await user.generateAuthToken();
    user = await user.save();
    return res.status(200).send({ user, token });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
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
    return res.status(401).send({ message: 'unauthorized' });
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

async function addFriend(req, res) {
  try {
    let friend = await User.findOne({
      username: req.body.username,
    });
    if (!friend) {
      throw { message: 'user not found' };
    }

    let newFriendship = await req.user.addFriend(friend);
    /** mongo does some fancy magic with their object that causes them not to quite behave regularly */
    await friend.reAddFriend({ ...JSON.parse(JSON.stringify(req.user)), friendship_id: newFriendship._id});
    return res.status(200).send({ message: 'friend successfully added' });
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
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
    let currentChat = await req.user.getChat(friendship_id, parseInt(limit));
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
  let currentChat = await req.user.getChatPage(
    req.params.friendship_id,
    parseInt(req.query.limit),
    parseInt(req.query.timestamp)
  );
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
      let info = await Message.markAsReceived(friendship_id, range, req.user.username);
      res.status(200).send({ message: 'success' });
      io.to(friendship_id).emit('sweep', { range, friendship_id, fromId: req.user._id });
      return;
    } catch (e) {
      res.status(500).send({ message: 'error retrieving messages' });
    }
  };
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
  getLastMessage,
  getFriends,
  chatRedirect,
  getMessages,
  createUser,
  login,
  logout,
  imageUpload,
  getMe,
  sweep,
  getUsers,
  emojis,
  logout,
  updateInfo,
  authenticate,
  HTMLauthenticate,
  addFriend,
  getUser,
};
