const { EventEmitter } = require('events');
const crypto = require('crypto');
const { defaultCrypto } = require('./crypto');
const ntfyTransport = require('./transports/ntfyTransport');

class NetMsgClient extends EventEmitter {
  constructor(options) {
    super();
    if (!options || !options.secret) {
      throw new Error('NetMsgClient: l\'option "secret" est obligatoire');
    }
    this.secret = options.secret;
    this.name = options.name || 'anonyme';
    this.transport = options.transport || ntfyTransport;
    this.crypto = options.crypto || defaultCrypto;
    this.topicPrefix = options.topicPrefix || 'netmsg-';

    this.topic = this.crypto.deriveTopic(this.secret, this.topicPrefix);
    this.key = this.crypto.deriveKey(this.secret);
    this.id = crypto.randomBytes(6).toString('hex');

    this._connection = null;
  }

  connect() {
    if (this._connection) return;
    this._connection = this.transport.connect(
      this.topic,
      (rawMessage) => this._handleIncoming(rawMessage),
      (err) => this.emit('error', err)
    );
    this.emit('connected', { topic: this.topic });
  }

  disconnect() {
    if (this._connection) {
      this._connection.close();
      this._connection = null;
      this.emit('disconnected');
    }
  }

  async send(text) {
    const payload = JSON.stringify({ id: this.id, name: this.name, text });
    const encrypted = this.crypto.encrypt(this.key, payload);
    try {
      await this.transport.send(this.topic, encrypted);
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  _handleIncoming(rawMessage) {
    let payload;
    try {
      payload = JSON.parse(this.crypto.decrypt(this.key, rawMessage));
    } catch (e) {
      return;
    }
    if (payload.id === this.id) return;
    this.emit('message', { name: payload.name, text: payload.text, senderId: payload.id });
  }
}

module.exports = { NetMsgClient };
