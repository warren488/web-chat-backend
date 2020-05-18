const webpush = require('web-push');
let User = require('../models/User');

async function sendPushMessage(user, { friendship_id, text, from }) {
  const receiver = await User.findOne(
    {
      friends: {
        $elemMatch: {
          _id: friendship_id,
          id: user._id,
        },
      },
    },
    { pushKey: 1, pushEnabled: 1 }
  );
  if (receiver.pushEnabled) {
    webpush.setVapidDetails(
      'mailto:test@test.com',
      process.env.vapidPub,
      process.env.vapidPriv
    );
    const payload = JSON.stringify({
      title: `${user.username}`,
      text: text,
      from
    });
    if (receiver.pushKey) {
      webpush
        .sendNotification(JSON.parse(receiver.pushKey), payload)
        .catch(console.log);
    }
  }
}

module.exports = {
  sendPushMessage,
};
