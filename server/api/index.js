let router = require("express").Router()
let { getUser, getUsers, getMe, login, updateInfo, disablePush, subScribeToPush, imageUpload, createUser, authenticate, logout, addFriend, getFriends, chatRedirect, getMessages,getChatPage, getLastMessage} = require('../services')

router.post('/login', login)
router.post('/logout', authenticate, logout)
router.post('/signup', createUser)
router.get('/users', authenticate, getUsers)
router.get('/users/me', authenticate, getMe)
router.post('/users/me', authenticate, updateInfo)
router.get('/users/:username', getUser)
router.post('/users/:username/unsubscribe', authenticate, disablePush)
router.post('/users/:username/subscribe', authenticate, subScribeToPush)
router.delete('/users/me/token', authenticate, logout)
router.post('/users/me/friends', authenticate, addFriend)
router.get('/users/me/friends', authenticate, getFriends)
router.get('/users/me/:friendship_id/messages', authenticate, getMessages)
router.get('/users/me/:friendship_id/messagespage', authenticate, getChatPage)
router.get('/users/me/:friendship_id/lastmessage', authenticate, getLastMessage)

// file handling routes
router.post('/image', authenticate, imageUpload)

module.exports = router

// testing routes
router.get('/test/users/me/:friendship_id/messages', getMessages)
router.get('/test/users/me/:friendship_id/lastmessage', getLastMessage)
