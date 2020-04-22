let router = require("express").Router()
let { getUser, getUsers, getMe, login, updateInfo, createUser, authenticate, logout, addFriend, getFriends, chatRedirect, getMessages,getChatPage, getLastMessage} = require('../services')

router.post('/login', login)
router.post('/signup', createUser)
router.get('/users', authenticate, getUsers)
router.get('/users/me', authenticate, getMe)
router.post('/users/me', authenticate, updateInfo)
router.get('/users/:username', getUser)
router.delete('/users/me/token', authenticate, logout)
router.post('/users/me/friends', authenticate, addFriend)
router.get('/users/me/friends', authenticate, getFriends)
router.get('/users/me/:friendship_id/messages', authenticate, getMessages)
router.get('/users/me/:friendship_id/messagespage', authenticate, getChatPage)
router.get('/users/me/:friendship_id/lastmessage', authenticate, getLastMessage)

// redirect routes
router.post('/users/me/chat', authenticate, chatRedirect)
module.exports = router

// testing routes
router.get('/test/users/me/:friendship_id/messages', getMessages)
router.get('/test/users/me/:friendship_id/lastmessage', getLastMessage)
