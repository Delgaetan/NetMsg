const crypto = require('crypto');

const SALT = 'netmsg-salt-v1';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const defaultCrypto = {
  deriveTopic(secret, prefix = 'netmsg-') {
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    return prefix + hash.slice(0, 24);
  },

  deriveKey(secret) {
    return crypto.scryptSync(secret, SALT, 32);
  },

  encrypt(key, plaintext) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, enc]).toString('base64');
  },

  decrypt(key, b64) {
    const data = Buffer.from(b64, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const enc = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  },
};

module.exports = { defaultCrypto };
