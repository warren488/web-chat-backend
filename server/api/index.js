let router = require("express").Router()
let {login, createUser, authenticate, logout, addFriend, chatRedirect} = require('../services')

router.post('/login', login)
router.post('/signup', createUser)
router.delete('/users/me/token', authenticate, logout)
router.post('/users/me/friends', authenticate, addFriend)
router.post('/users/me/chat', authenticate, chatRedirect)

module.exports = router

