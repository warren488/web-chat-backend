let User = require('../models/User')


async function createUser(req, res) {

    try {
        // await User.schema.methods.validateSchema(req.body)
        let user = new User({ ...req.body, chats: [] })

        let token = await user.generateAuthToken()
        console.log(req.body);
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
            console.log('finbycred', req.body);

            user = await User.findByCredentials('username', req.body)
            console.log('found', user);

            token = await user.generateAuthToken()
        }


        return res.status(200).send({ token })

    } catch (error) {
        console.log(error)
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
            throw 'not fond'
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
        user = await User.findByToken(token)
        if (!user) {
            throw 'not fond'
        }
    } catch (error) {
        return res.redirect(303, '/login')

    }
    req.user = user
    req.token = token
    next();
}

async function addFriend(req, res) {
    console.log(req.body.username);

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

async function chatRedirect(req, res) {

    fid = req.body.friendship_id.toString()
    let chat
    if (req.user.chats) {

        chat = await req.user.findUniqueChat(fid, 'friendship_id')

        console.log(chat);
        if (chat !== undefined) {
            return res.status(278).send({ redirect: '/users/me/' + chat.friendship_id.toString() })

        } else {
            let [friend] = req.user.friends.filter(friend => { return friend._id.toString() === fid })
            if (friend) {
                chat = await req.user.startChat({ friendship_id: fid, messages: [] });
                console.log(req.user);

                return res.status(278).send({ redirect: '/users/me/' + chat.friendship_id.toString() })
            } else {
                return res.status(500).send({ message: 'error starting chat' })
            }

        }
    }

}

module.exports = { chatRedirect, createUser, login, logout, authenticate, HTMLauthenticate, addFriend }