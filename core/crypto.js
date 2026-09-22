const crypto = require('crypto');

const SALT = 'netmsg-salt-v1';

const defaultCrypto = {
  deriveTopic(secret, prefix = 'netmsg-') {
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    return prefix + hash.slice(0, 24);
  },

  deriveKey(secret) {
    return crypto.scryptSync(secret, SALT, 32);
  },

  encrypt(key, plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, enc]).toString('base64');
  },

  decrypt(key, b64) {
    const data = Buffer.from(b64, 'base64');
    const iv = data.subarray(0, 16);
    const enc = data.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  },
};

module.exports = { defaultCrypto };
