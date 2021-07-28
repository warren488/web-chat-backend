let router = require('express').Router();
let {
  generateUserFirebaseToken,
  sendFriendRequest,
  searchUser,
  getUsers,
  getMe,
  login,
  updateInfo,
  revokeAllTokens,
  disablePush,
  previewLink,
  subScribeToPush,
  imageUpload,
  createUser,
  authenticate,
  logout,
  addFriend,
  getFriends,
  chatRedirect,
  crashReport,
  getMessages,
  getChatPage,
  getUserNotifications,
  getLastMessage,
} = require('../services');

module.exports = function (io) {
  router.post('/crashreport', crashReport);
  router.post('/login', login);
  router.post('/logout', authenticate, logout);
  router.post('/signup', createUser);
  router.get('/users', authenticate, getUsers);
  router.get('/users/me', authenticate, getMe);
  router.post('/users/me', authenticate, updateInfo);
  router.post('/users/me/friendRequests', authenticate, sendFriendRequest(io));
  router.get('/users/me/notifications', authenticate, getUserNotifications);
  router.delete('/users/me/tokens', authenticate, revokeAllTokens);
  router.delete('/users/me/token', authenticate, logout);
  router.post(
    '/users/me/generatefbtoken',
    authenticate,
    generateUserFirebaseToken
  );
  router.post('/users/me/friends', authenticate, addFriend(io));
  router.get('/users/me/friends', authenticate, getFriends);
  router.get('/users/me/:friendship_id/messages', authenticate, getMessages);
  router.get(
    '/users/me/:friendship_id/messagespage',
    authenticate,
    getChatPage
  );
  router.get(
    '/users/me/:friendship_id/lastmessage',
    authenticate,
    getLastMessage
  );
  router.get('/users/:username', searchUser);
  router.post('/users/:username/unsubscribe', authenticate, disablePush);
  router.post('/users/:username/subscribe', authenticate, subScribeToPush);
  router.post('/getpreview', authenticate, previewLink);

  // file handling routes
  // router.post('/image', authenticate, imageUpload);

  return router;
};
