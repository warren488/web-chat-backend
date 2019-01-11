class ChatRoom {
    constructor(name) {
        this.name = name;
        this.users = {}
        this.userList = []
    }

    addUser(id, name) {
        let user = { name }
        this.users[id] = user
        this.userList.push(name)
        return user
    }

    removeUser(id) {
        if (id in this.users) {
            let ret = this.users[id]
            delete this.users[id]
            this.userList = this.userList.filter(user => user !== ret.name)
            return ret
        } else {
            return null
        }

    }

    getUser(id) {
        return this.users[id] || null
    }

    getUsers() {
        return this.userList
    }

}

module.exports = ChatRoom