const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
/** @namespace */
let MessageSchema = new mongoose.Schema({
  msgId: {
    type: ObjectId,
    required: true,
  },
  linkPreview: {
    title: String,
    image: String,
    description: String,
    id: String,
  },
  text: {
    type: String,
  },
  type: {
    type: String,
  },
  media: {
    type: String,
  },
  meta: {
    height: { type: Number },
    width: { type: Number },
    length: { type: Number },
  },
  url: {
    type: String,
  },
  createdAt: {
    type: Number,
    required: true,
    index: true,
  },
  from: {
    type: String,
    required: true,
  },
  quoted: {
    type: this,
    required: false,
  },
  status: {
    type: String,
    required: false,
  },
  friendship_id: {
    type: ObjectId,
    required: true,
    index: true,
  },
  user_id: {
    type: ObjectId,
    required: true,
    index: true,
  },
  fromId: {
    type: ObjectId,
    required: true,
    index: true,
  },
});

async function markAsReceived(friendship_id, range, username) {
  return this.updateMany(
    {
      friendship_id,
      /** @todo changename failure */
      from: {
        $ne: username,
      },
      createdAt: {
        $gte: range[0],
        $lte: range[1],
      },
    },
    {
      $set: {
        status: 'received',
      },
    }
  );
}

MessageSchema.statics.markAsReceived = markAsReceived;

let Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
