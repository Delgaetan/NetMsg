const collections = new Map();
let counter = 0;

function nextId() {
  counter += 1;
  return String(counter).padStart(12, '0');
}

const memoryStorage = {
  async append(path, item) {
    if (!collections.has(path)) collections.set(path, []);
    const id = nextId();
    const stored = { id, ...item };
    collections.get(path).push(stored);
    return stored;
  },

  async list(path, options = {}) {
    const limit = options.limit || 20;
    const items = collections.get(path) || [];
    return items.slice(-limit);
  },
};

module.exports = { memoryStorage };
