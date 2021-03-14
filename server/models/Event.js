const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;
/** @namespace */
let EventSchema = new mongoose.Schema({
  type: {
    type: String,
  },
  seen: {
    type: Boolean,
    required: true,
    default: false,
  },
  createdAt: {
    type: Number,
    required: true,
    index: true,
  },
  user_id: {
    type: ObjectId,
    required: true,
    index: true,
  },
  meta_reference: {
    type: Array,
  },
});

async function clearAllNotifs(user_id, timestamp) {
  return this.updateMany(
    {
      user_id,
      createdAt: {
        $lte: timestamp,
      },
    },
    {
      $set: {
        seen: true,
      },
    }
  );
}
async function clearAllNotifsOfType({ user_id, timestamp, type }) {
  return this.updateMany(
    {
      user_id,
      createdAt: {
        $lte: timestamp,
      },
      type,
    },
    {
      $set: {
        seen: true,
      },
    }
  );
}

EventSchema.statics.clearAllNotifs = clearAllNotifs;
EventSchema.statics.clearAllNotifsOfType = clearAllNotifsOfType;

let Event = mongoose.model("Event", EventSchema);

module.exports = Event;
