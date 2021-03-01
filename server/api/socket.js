let router = require("express").Router();
let { sweep, authenticate, clearNotifType } = require("../services");

module.exports = function (io) {
  // todo
  router.post("/users/me/:friendship_id/sweep", authenticate, sweep(io));
  router.post("/users/me/clearNotifType", authenticate, clearNotifType(io));
  return router;
};
