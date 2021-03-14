const User = require("./User");

module.exports = Object.freeze({
  friendRequest: async ({ user_id, id }) => {
    const user = await User.findById(user_id);
    return user.interactions.friendRequest
  },
});
