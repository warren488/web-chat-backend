const mongoose = require("mongoose")
const validator = require("validator")
// const Joi = require("joi")
const jwt = require("jsonwebtoken")
const { SALT } = require("../config")
const hash = require("../services/hash")
const bcrypt = require("bcryptjs")
const ObjectId = mongoose.Schema.Types.ObjectId

let MessageSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Number,
        required: true
    },
    from: {
        type: String,
        required: true
    }
})
let userSchema = new mongoose.Schema({
    email: {
        type: String,
        trim: true,
        minlength: 1,
        unique: true,
        validate: {
            validator: validator.isEmail,
            message: '{VALUE} is not a valid email'
        }
    },
    username: {
        type: String,
        unique: true,
        required: true,
        minlength: 4
    },
    friends: [{
        id: {
            type: ObjectId,
            required: true
        },
        username: {
            type: String,
            required: true
        }
    }],
    chats: [{
        friendship_id: {
            type: ObjectId,
            required: true
        },
        messages: [{
            text: {
                type: String,
                required: true
            },
            createdAt: {
                type: Number,
                required: true
            },
            from: {
                type: String,
                required: true
            },
            quoted: {
                type: MessageSchema,
                required: false
            }
        }]
    }],
    password: {
        type: String,
        required: true,
        minlength: 7
    },
    tokens: [{
        access: {
            type: String,
            required: true
        },
        token: {
            type: String,
            required: true
        }
    }]
})


userSchema.methods.validateSchema = async (schema) => {
    // may be overkill... have to find out if this offers benefits over the mongoose validation
    // const result = Joi.validate(schema, Joi.object({
    //     email: Joi.string().required(),
    //     username: Joi.string().required(),
    //     password: Joi.string().required(),
    //     tokens: Joi.array().items(Joi.object({
    //         access: Joi.string(),
    //         token: Joi.string()
    //     }))

    // }))
    if (result.error) {
        throw result.error
    }
    return schema
}

userSchema.methods.generateAuthToken = async function generateAuthToken() {
    console.log(SALT);

    let token = jwt.sign({ _id: this._id }, SALT)
    this.tokens = this.tokens.concat([{
        access: 'auth',
        token
    }])
    await this.save()
    return token
}

userSchema.methods.startChat = async function startChat(chat) {
    //  TODO: MAKE SURE THAT THE USER IS A FRIEND FIRST
    // check for existing chat first
    let newChat = await this.findUniqueChat(chat.friendship_id, 'friendship_id')
    if (!newChat) {
        newChat = { _id: new mongoose.Types.ObjectId(), ...chat }
        this.newChat = this.chats.concat([newChat])
        await this.save()

    }
    return newChat
}

userSchema.methods.addFriend = async function addFriend(id, username) {
    let friend = { _id: new mongoose.Types.ObjectId(), id, username }
    this.friends = this.friends.concat([friend])
    await this.save()
    return friend
}

userSchema.methods.reAddFriend = async function reAddFriend(friend_id, username, friendship_id) {
    let friend = { _id: friendship_id, id: friend_id, username }
    this.friends = this.friends.concat([friend])
    await this.save()
    return friend
}

userSchema.methods.findUniqueChat = async function findUniqueChat(val, propertyname) {
    // currently only works for strings
    // method doesnt actually ensure uniqueness, rather it only returns one value 
    let index
    let chats = this.chats.filter((chat, index) => {
        if (chat) {
            return chat[propertyname].toString() === val
        }
        return false

    })
    if (chats.length > 1) {
        console.warn('using find unique chat with non unique identifiers');
    }
    return chats[0]
}

userSchema.methods.findFriend = async function findFriend(val, propertyname) {
    let friend = this.friends.find(friend => {
        if (friend) {
            console.log(friend[propertyname].toString() + ' === ' + val)
            return friend[propertyname].toString() === val
        }
        return false
    })
    return friend
}

userSchema.methods.getMessage = async function getMessage(friendship_id, msgId) {
    let chatIndex = await this.findUniqueChatIndex(friendship_id, 'friendship_id')
    if (chatIndex === -1) {
        await this.startChat({ friendship_id, messages: [] })
        chatIndex = await this.findUniqueChatIndex(friendship_id, 'friendship_id')
    }

    return this.chats[chatIndex].messages.find(message => {
        if (message) {
            return message._id.toString() === msgId
        }
        return false

    })
}

userSchema.methods.findUniqueChatIndex = async function findUniqueChat(val, propertyname) {
    // method doesnt actually ensure uniqueness, rather it only returns one value 
    let index = this.chats.findIndex((chat, index) => {
        if (chat) {
            console.log(chat[propertyname].toString() + ' === ' + val);
            console.log(chat[propertyname].toString() === val);

            return chat[propertyname].toString() === val
        }
        return false

    })

    return index
}

userSchema.methods.addMessage = async function addMessage(friendship_id, message) {
    await this.startChat({
        friendship_id,
        messages: []
    })
    let index = await this.findUniqueChatIndex(friendship_id, 'friendship_id')
    console.log(index);


    let _id = new mongoose.Types.ObjectId()
    console.log(message)
    saveMessage = { _id, ...message }
    console.log(saveMessage)
    this.chats[index].messages = this.chats[index].messages
        .concat([saveMessage])
    await this.save()
    return _id
}

userSchema.methods.toJSON = function () {
    user = this
    console.log(user)
    return {
        id: user._id,
        email: user.email,
        username: user.username
    }
}

userSchema.statics.findByToken = async function findByToken(token) {
    let User = this
    let decoded = jwt.verify(token, SALT)
    let user = await User.findOne({
        id: decoded.id,
        'tokens.token': token,
        'tokens.access': 'auth'
    })
    if (!user) {
        throw ({ message: 'user not found' })
    }
    return user
}

userSchema.statics.findByCredentials = async function findByCredentials(uniqueId, credentials) {
    let user = await this.findOne({
        [uniqueId]: credentials[uniqueId]
    })
    if (!user) {
        throw ({ message: 'user not found' })
    }
    if (!bcrypt.compareSync(credentials.password, user.password)) {
        throw ({ message: 'incorrect credentials' })

    }
    return user
}



userSchema.methods.removeToken = async function removeToken(token) {
    let user = this
    if (!token) {
        throw ({ message: "no token passed" })
    }
    await user.update({
        $pull: {
            tokens: {
                token
            }
        }
    })
    await user.save()
}

userSchema.pre('save', function preSave(next) {
    let user = this
    if (user.chats === undefined) {
        user.chats = []
    }
    if (user.isModified('password')) {
        user.password = hash(user.password)
        next()
    } else {
        next()
    }
})

let User = mongoose.model('User', userSchema)

module.exports = User