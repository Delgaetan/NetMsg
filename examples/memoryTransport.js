const topics = new Map();

function connect(topic, onMessage, onError) {
  if (!topics.has(topic)) topics.set(topic, new Set());
  const listener = { onMessage };
  topics.get(topic).add(listener);

  return {
    close() {
      const set = topics.get(topic);
      if (set) set.delete(listener);
    },
  };
}

function send(topic, rawString) {
  return new Promise((resolve) => {
    const set = topics.get(topic);
    if (set) {
      for (const listener of set) {
        setImmediate(() => listener.onMessage(rawString));
      }
    }
    resolve();
  });
}

module.exports = { connect, send };
