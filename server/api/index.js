let router = require("express").Router()
let {login, createUser, authenticate, logout, addFriend, getFriends, chatRedirect, getMessages, getLastMessage} = require('../services')

router.post('/login', login)
router.post('/signup', createUser)
router.delete('/users/me/token', authenticate, logout)
router.post('/users/me/friends', authenticate, addFriend)
router.get('/users/me/friends', authenticate, getFriends)
router.get('/users/me/:friendship_id/messages', authenticate, getMessages)
router.get('/users/me/:friendship_id/lastmessage', authenticate, getLastMessage)

// redirect routes
router.post('/users/me/chat', authenticate, chatRedirect)
module.exports = router

