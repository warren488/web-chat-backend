const webpush = require('web-push');
let User = require('../models/User');

async function sendPushMessage(user, { friendship_id, text, media, createdAt }) {
  const receiver = await User.findOne(
    {
      friends: {
        $elemMatch: {
          _id: friendship_id,
          friendId: user._id,
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
      text: media ? `new ${media}` : text,
      friendship_id,
      createdAt
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
