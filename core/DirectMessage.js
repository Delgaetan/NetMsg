const { NetMsgClient } = require('./NetMsgClient');

const PREFIX = 'netmsg-dm-v1:';

function deriveDirectSecret(username) {
  if (!username) {
    throw new Error('deriveDirectSecret: pseudo obligatoire');
  }
  return PREFIX + username.trim().toLowerCase();
}

function createDirectClient({ toUsername, myUsername, ...options }) {
  if (!toUsername) {
    throw new Error('createDirectClient: toUsername obligatoire');
  }
  return new NetMsgClient({
    ...options,
    secret: deriveDirectSecret(toUsername),
    name: myUsername || 'anonyme',
  });
}

module.exports = { deriveDirectSecret, createDirectClient };
