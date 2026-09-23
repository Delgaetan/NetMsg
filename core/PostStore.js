class PostStore {
  constructor(options) {
    if (!options || !options.storage) {
      throw new Error('PostStore: l\'option "storage" est obligatoire');
    }
    this.storage = options.storage;
    this.path = options.path || 'posts';
  }

  post(item) {
    return this.storage.append(this.path, item);
  }

  feed(options) {
    return this.storage.list(this.path, options);
  }
}

module.exports = { PostStore };
