let router = require('express').Router();
let { sweep, authenticate } = require('../services');


module.exports = function (io) {
  // todo
  router.post('/users/me/:friendship_id/sweep', authenticate, sweep(io));
  return router
};
