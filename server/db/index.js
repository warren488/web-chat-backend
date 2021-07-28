const mongoose = require("mongoose");
const { MONGO_URI } = require("../config");
mongoose.Promise = global.Promise;

mongoose.connect(MONGO_URI, { useNewUrlParser: true });

module.exports = { mongoose };
