/**
 * @file The User model for the DB
 * @author Warren Scantlebury
 * @namespace User
 */
const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { SALT } = require('../config');
const hash = require('../services/hash');
const bcrypt = require('bcryptjs');
const ObjectId = mongoose.Schema.Types.ObjectId;
const Message = require('./Message');

let userSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    minlength: 1,
    unique: true,
    index: true,
    sparse: true,
    validate: {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email',
    },
  },
  pushKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  pushEnabled: {
    type: Boolean,
  },
  username: {
    type: String,
    unique: true,
    index: true,
    required: true,
    minlength: 4,
  },
  friends: [
    {
      id: {
        type: ObjectId,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      imgUrl: {
        type: String,
      },
    },
  ],
  password: {
    type: String,
    required: true,
    minlength: 7,
  },
  lastOnline: {
    type: Number,
  },
  imgUrl: {
    type: String,
  },
  status: {
    type: String,
  },
  location: {
    type: String,
  },
  tokens: [
    {
      access: {
        type: String,
        required: true,
      },
      token: {
        type: String,
        required: true,
      },
    },
  ],
});

/**
 * generate an authentication token for the user
 * @returns {String} token that was generated
 * @memberof User
 */
async function generateAuthToken() {
  let token = jwt.sign({ _id: this._id }, SALT);
  this.tokens = this.tokens.concat([
    {
      access: 'auth',
      token,
    },
  ]);
  await this.save();
  return token;
}

/**
 * get a chat between this user and another using the frienship id
 * @param {String} friendship_id the Id of the friendship for the chat we want to get
 * @param {Number} limit the limit of messages we want from the chat
 * @todo implement the limit and utilize it
 * @memberof User
 */
async function getChat(friendship_id, limit) {
  let chat = await Message.find(
    {
      user_id: this._id,
      friendship_id: friendship_id,
    },
    {},
    { limit, sort: { createdAt: -1 } }
  );
  return chat;
}

async function getChatPage(friendship_id, limit, timestamp) {
  let chat = await Message.find(
    {
      user_id: this._id,
      friendship_id: friendship_id,
      createdAt: {
        $lte: timestamp,
      },
    },
    {},
    { limit, sort: { createdAt: -1 } }
  );
  return chat;
}

async function getLastMessage(friendship_id) {
  let chat = await Message.find(
    {
      user_id: this._id,
      friendship_id: friendship_id,
    },
    {
      _id: 1,
      msgId: 1,
      text: 1,
      from: 1,
      fromId: 1,
    },
    {
      skip: 0,
      limit: 1,
      sort: {
        createdAt: -1,
      },
    }
  );
  return chat;
}

/**
 *
 * @param {String} id ID of the friend we want to add
 * @param {String} username username of the friend we want to add
 * @memberof User
 */
async function addFriend({ id, username, imgUrl }) {
  let friend = this.friends.find((friend) => friend.username === username);
  if (friend) {
    return friend;
  }
  friend = { _id: new mongoose.Types.ObjectId(), id, username, imgUrl };
  this.friends = this.friends.concat([friend]);
  await this.save();
  return friend;
}

/**
 * This function is used when we add a friend for a user and have updated their friendslists
 * we now want to update the friendslist of their new friend with out pre generated friendship id
 * @param {String} id ID of the friend we are adding
 * @param {String} username username of the friend we are adding
 * @param {String} friendship_id friendship ID that will identify the friendship (same for both users)
 * @memberof User
 */
async function reAddFriend({ id, username, friendship_id, imgUrl }) {
  let friend = this.friends.find((friend) => friend.username === username);
  if (friend) {
    return friend;
  }
  friend = { _id: friendship_id, id: id, username, imgUrl };
  this.friends = this.friends.concat([friend]);
  await this.save();
  return friend;
}

/**
 * This function finds a friend of the current user that has a property matching the given value
 * (all processing done in memory)
 * @param {*} val value of the property we want to search for on the friend
 * @param {String} propertyname the name of the property we want search for
 * @memberof User
 */
// use array queries instead of looping (faster for smaller data?)
async function findFriend(val, propertyname) {
  let friend = this.friends.find((friend) => {
    if (friend) {
      return friend[propertyname].toString() === val;
    }
    return false;
  });
  return friend;
}

async function subscribeToNotifs(key) {
  this.pushKey = key;
  this.pushEnabled = true;
  return this.save();
}

async function disablePush() {
  this.pushEnabled = false;
  return this.save();
}

/**
 * The all important function to add messages to the DB for this particular user only
 * @param {String} friendship_id friendship id of the message we want to add
 * @param {Object} message an object containing message data
 * @memberof User
 */
// FIXME: should this really be attached to the user schema?
async function addMessage(friendship_id, message) {
  // TODO: maybe we only need the status for our message as the user wont see status for messages
  // we sent, in which case the status would be set outside
  const newMessage = new Message({
    status: 'sent',
    user_id: this._id,
    friendship_id,
    ...message,
  });
  await newMessage.save();
  return newMessage._id;
}

/**
 * determines the value of a user when connverted to a json object
 * @memberof User
 */
function toJSON() {
  user = this;
  return {
    id: user._id,
    email: user.email,
    username: user.username,
    lastOnline: user.lastOnline,
    imgUrl: user.imgUrl,
    status: user.status,
    location: user.location,
  };
}

/**
 * find a user by their token, which is essence validates a user/token as well
 * @param {String} token the token of the user we want to find
 * @memberof User
 */
async function findByToken(token) {
  let User = this;
  let decoded = jwt.verify(token, SALT);
  let user = await User.findOne({
    id: decoded.id,
    'tokens.token': token,
    'tokens.access': 'auth',
  });
  if (!user) {
    throw { message: 'user not found' };
  }
  return user;
}

/**
 * find and essentially authenticate a user by credentials specified
 * @param {String} uniqueId name of the credential we want to identify the user by
 * @param {String} credentials the value for the credential specified
 * @example
 *  findByCredentials('username', { username: 'myuname', password: 'password' })
 * @memberof User
 */
async function findByCredentials(uniqueId, credentials) {
  let user = await this.findOne({
    [uniqueId]: credentials[uniqueId],
  });
  if (!user) {
    throw { message: 'user not found' };
  }
  if (!bcrypt.compareSync(credentials.password, user.password)) {
    throw { message: 'incorrect credentials' };
  }
  return user;
}

/**
 * find a user by username
 * @param {String} username name of the credential we want to identify the user by
 * @example
 *  findByUsername('username')
 * @memberof User
 */
async function findByUsername(username) {
  let user = await this.findOne({
    username,
  });
  console.log(user, username);
  if (!user) {
    throw { message: 'user not found' };
  }
  return user;
}

/**
 * find a group of users by username
 * @param {String} username name of the credential we want to identify the user by
 * @example
 *  filterByUsername('username')
 * @memberof User
 */
async function filterByUsername(userId, username) {
  let users = await User.find({
    $text: {
      $search: username,
    },
    _id: {
      $ne: userId,
    },
  });
  if (!users) {
    throw { message: 'user not found' };
  }
  return users;
}

/**
 * Remove a token for the specific user
 * @param {String} token the token we would like to remove
 * @memberof User
 */
async function removeToken(token) {
  let user = this;
  if (!token) {
    throw { message: 'no token passed' };
  }
  await user.update({
    $pull: {
      tokens: {
        token,
      },
    },
  });
  await user.save();
}

async function updateInfo(info) {
  if ('email' in info && info.email === '') {
    /**
     * email is special because it must be unique, but it is not required so we have to make sure
     * that if a user tries to delete it by sending an empty string we completely remove it if not
     * we will have clashes with multiple emails being empty strings
     */
    this.email = undefined;
    delete info.email;
  }
  for (const key in info) {
    if (User.writableProperties.includes(key)) {
      this[key] = info[key];
    }
  }
  /** if we have friends then update their info for us */
  if (this.friends.length > 0) {
    let queryArray = [];
    let updateObject = {};
    for (const friend of this.friends) {
      queryArray.push({
        _id: friend.id,
      });
    }
    if (info.username) {
      updateObject['friends.$.username'] = info.username;
    }
    if (info.imgUrl) {
      updateObject['friends.$.imgUrl'] = info.imgUrl;
    }
    console.log(
      await User.updateMany(
        {
          $or: queryArray,
          friends: {
            $elemMatch: {
              id: this._id,
            },
          },
        },
        {
          $set: updateObject,
        }
      )
    );
  }
  return this.save();
}

const writableProperties = [
  'username',
  'password',
  'email',
  'lastOnline',
  'imgUrl',
  'status',
  'location',
];

userSchema.methods.generateAuthToken = generateAuthToken;
userSchema.methods.getChat = getChat;
userSchema.methods.addFriend = addFriend;
userSchema.methods.reAddFriend = reAddFriend;
userSchema.methods.findFriend = findFriend;
userSchema.methods.addMessage = addMessage;
userSchema.methods.updateInfo = updateInfo;
userSchema.methods.disablePush = disablePush;
userSchema.methods.subscribeToNotifs = subscribeToNotifs;
userSchema.methods.getLastMessage = getLastMessage;
userSchema.methods.toJSON = toJSON;
userSchema.methods.removeToken = removeToken;
userSchema.methods.getChatPage = getChatPage;
userSchema.statics.findByToken = findByToken;
userSchema.statics.findByCredentials = findByCredentials;
userSchema.statics.findByUsername = findByUsername;
userSchema.statics.filterByUsername = filterByUsername;
userSchema.statics.writableProperties = writableProperties;

userSchema.pre(
  'save',
  /**
   * uses the mongoose provided pre save to check for a change in the password and hash it before saving
   * @param {Function} next the next function to allow the save
   */
  function preSave(next) {
    let user = this;
    if (user.chats === undefined) {
      user.chats = [];
    }
    if (user.isModified('password')) {
      user.password = hash(user.password);
      next();
    } else {
      next();
    }
  }
);

let User = mongoose.model('User', userSchema);
module.exports = User;
