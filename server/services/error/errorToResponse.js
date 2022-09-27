const { uniqueConst } = require("./errorAdapters");

module.exports = new Map([
  [
    'signup',
    [
      function (err) {
        if (uniqueConst(err, 'username')) {
          return uniqueConst(err, 'username');
        } else if (uniqueConst(err, 'email')) {
          return uniqueConst(err, 'email');
        }
      },
      function (err) { },
    ],
  ],
  [
    'any',
    [
      function (err) {
        if (err.userMessage) {
          return { message: err.userMessage };
        }
      },
    ],
  ],
]);

