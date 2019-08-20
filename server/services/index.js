let User = require('../models/User')
// get our emojis to export through services
const emojis = require('./emoji')

async function createUser(req, res) {

    try {
        // await User.schema.methods.validateSchema(req.body)
        let user = new User({ ...req.body, chats: [] })

        let token = await user.generateAuthToken()
        user = await user.save()
        return res.status(200).send({ user, token })
    } catch (error) {
        console.log(error.message)
        return res.status(500).send(error)
    }
}

async function login(req, res) {
    try {
        let user
        let token
        if (req.body.token) {
            token = req.body.token
            user = await User.findByToken(req.body.token)

        } else {

            user = await User.findByCredentials('username', req.body)

            token = await user.generateAuthToken()
        }


        return res.status(200).send({ token, username: user.username })

    } catch (error) {
        console.log(error)
        if(error.message === "incorrect credentials"){
            return res.status(401).send(error)
        }
        return res.status(500).send(error)
    }
}

async function logout(req, res) {
    let token = req.header('x-auth');
    try {
        await req.user.removeToken(token)
        return res.status(200).send({ message: "logout successful" })
    } catch (error) {
        console.log(error)
        return res.status(500).send(error)
    }
}

async function authenticate(req, res, next) {
    let token = req.header('x-auth');
    let user
    try {
        user = await User.findByToken(token)
        if (!user) {
            throw 'not found'
        }
    } catch (error) {
        return res.status(401).send({ message: "unauthorized" })

    }
    req.user = user
    req.token = token
    next();
}

async function HTMLauthenticate(req, res, next) {
    let token = req.cookies.token;
    let user
    try {
        if (token) {
            user = await User.findByToken(token)
        }
        if (!user) {
            throw 'not found'
        }
    } catch (error) {
        console.log(error)
        return res.redirect(303, '/login')

    }
    req.user = user
    req.token = token
    next();
}

async function addFriend(req, res) {

    try {
        let friend = await User.findOne({
            username: req.body.username
        })
        if (!friend) {
            throw ({ message: 'user not found' })
        }

        let newFriendship = await req.user.addFriend(friend.id, friend.username)
        await friend.reAddFriend(req.user.id, req.user.username, newFriendship._id)
        return res.status(200).send({ message: "friend successfully added" })
    } catch (err) {
        console.log(err)
        return res.status(500).send(err)
    }
}

// TODO: eventually remove after the frontend uses direct links
async function chatRedirect(req, res) {

    fid = req.body.friendship_id.toString()
    return res.status(278).send({ redirect: '/users/me/' + fid })

}

async function getMessages(req, res) {
    let currentChat = await req.user.getChat(req.params.friendship_id)
    return res.status(200).send(currentChat)
    
}

module.exports = { chatRedirect, getMessages, createUser, login, emojis, logout, authenticate, HTMLauthenticate, addFriend }