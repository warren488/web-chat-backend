const admin = require('firebase-admin');
const credCert = require('../config/firebase');

let credTest = `{
    "type": "${process.env.firebase_type}",
    "project_id": "${process.env.firebase_project_id}",
    "private_key_id": "${process.env.firebase_private_key_id}",
    "private_key": ${JSON.stringify(process.env.firebase_private_key)},
    "client_email": "${process.env.firebase_client_email}",
    "client_id": "${process.env.firebase_client_id}",
    "auth_uri": "${process.env.firebase_auth_uri}",
    "token_uri": "${process.env.firebase_token_uri}",
    "auth_provider_x509_cert_url": "${
      process.env.firebase_auth_provider_x509_cert_url
    }",
    "client_x509_cert_url": "${process.env.firebase_client_x509_cert_url}"
  }`;

let creds = JSON.parse(credTest);
creds.private_key = process.env.firebase_private_key.replace(/\\n/g, '\n')
console.log(creds)

admin.initializeApp({
  credential: admin.credential.cert(creds),
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
