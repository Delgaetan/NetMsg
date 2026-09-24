const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

class Accounts {
  constructor(options) {
    if (!options || !options.storage) {
      throw new Error('Accounts: option storage obligatoire');
    }
    this.storage = options.storage;
    this.path = options.path || 'accounts';
  }

  async _findByUsername(username) {
    const all = await this.storage.list(this.path, { limit: 10000 });
    return all.find((u) => u.username.toLowerCase() === username.toLowerCase());
  }

  async search(username) {
    const account = await this._findByUsername(username);
    if (!account) return null;
    return { id: account.id, username: account.username, createdAt: account.createdAt };
  }

  async register(username, password) {
    if (!username || !password) {
      throw new Error('Accounts.register: pseudo et mot de passe obligatoires');
    }
    if (password.length < 6) {
      throw new Error('Accounts.register: mot de passe trop court');
    }
    const existing = await this._findByUsername(username);
    if (existing) {
      throw new Error(`Accounts.register: le pseudo "${username}" est deja pris`);
    }
    const stored = await this.storage.append(this.path, {
      username,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    });
    return { id: stored.id, username: stored.username, createdAt: stored.createdAt };
  }

  async login(username, password) {
    const account = await this._findByUsername(username);
    if (!account) return null;
    if (!verifyPassword(password, account.passwordHash)) return null;
    return { id: account.id, username: account.username, createdAt: account.createdAt };
  }
}

module.exports = { Accounts, hashPassword, verifyPassword };
