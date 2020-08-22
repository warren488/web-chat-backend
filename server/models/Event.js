const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;
/** @namespace */
let EventSchema = new mongoose.Schema({
  type: {
    type: String,
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
  meta: {
    type: Array
  }
});

let Event = mongoose.model('Event', EventSchema);

module.exports = Event;
