const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;
/** @namespace */
let ErrorReportSchema = new mongoose.Schema({
  userId: {
    type: ObjectId
  },
  error: {
    type: String
  },
  userAgent: {
    type: String
  }
});

let ErrorReport = mongoose.model("ErrorReport", ErrorReportSchema);

module.exports = ErrorReport;
