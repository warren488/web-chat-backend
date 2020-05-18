const admin = require('firebase-admin');
const credCert = require('../config/firebase');

admin.initializeApp({
  credential: admin.credential.cert(credCert),
});

module.exports = {
  createCustomToken(uid) {
    return admin
      .auth()
      .createCustomToken(uid)
      .catch(function (error) {
        console.log('Error creating custom token:', error);
      });
  },
};
