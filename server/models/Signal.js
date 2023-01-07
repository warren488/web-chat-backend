
const mongoose = require("mongoose");
/** @namespace */
let SignalSchema = new mongoose.Schema({
  eventName: {
    type: String,
    index: true
  },
  friendship_id: {
    type: String,
    required: true,
    default: false
  },
  eventData: {
    type: Object,
    required: false
  },
  userId: {
    type: String,
    index: true,
    required: true,
    default: false
  },
  createdAt: {
    type: Number,
    required: true,
    index: true
  },
  valid: {
    type: Boolean,
    required: true,
  },
  seen: {
    type: Boolean,
    required: true,
  }
});

async function inValidateSignal(_id) {
  return Signal.update({
    _id
  }, {
    $set: {
      valid: false
    }
  });
}

async function staleSignal(_id) {
  return Signal.update({
    _id
  }, {
    $set: {
      seen: true
    }
  });
}

async function getUserSignals(user_id) {
  const signals = await Signal.find(
    {
      userId: user_id,
      seen: false
    },
  );
  await Signal.updateMany({
    $or: [{
      userId: user_id,
      seen: false,
      eventName: {
        // ongoing calls have thteir own way of being dismissed
        $ne: "call"
      }
    }, {
      userId: user_id,
      seen: false,
      valid: false,
      eventName: "call"
    }]
  }, {
    $set: {
      seen: true
    }
  })
  return signals
}


SignalSchema.statics.inValidateSignal = inValidateSignal;
SignalSchema.statics.staleSignal = staleSignal;
SignalSchema.statics.getUserSignals = getUserSignals;

let Signal = mongoose.model("Signal", SignalSchema);

module.exports = Signal;
