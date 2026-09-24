const crypto = require('crypto');

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

class Sessions {
  constructor(options) {
    if (!options || !options.storage) {
      throw new Error('Sessions: option storage obligatoire');
    }
    this.storage = options.storage;
    this.path = options.path || 'sessions';
    this.ttlMs = options.ttlMs || DEFAULT_TTL_MS;
  }

  async create(account) {
    if (!account || !account.id) {
      throw new Error('Sessions.create: attend un compte avec un id');
    }
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    await this.storage.append(this.path, {
      token,
      accountId: account.id,
      username: account.username,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    });
    return token;
  }

  async validate(token) {
    if (!token) return null;
    const all = await this.storage.list(this.path, { limit: 10000 });
    const session = all.find((s) => s.token === token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) return null;
    return { id: session.accountId, username: session.username };
  }

  async revoke(token) {
    if (typeof this.storage.remove !== 'function') {
      throw new Error('Sessions.revoke: le backend ne supporte pas remove()');
    }
    const all = await this.storage.list(this.path, { limit: 10000 });
    const session = all.find((s) => s.token === token);
    if (session) {
      await this.storage.remove(this.path, session.id);
    }
  }
}

module.exports = { Sessions };
