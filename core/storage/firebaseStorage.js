const https = require('https');

function createFirebaseStorage(databaseUrl) {
  const base = databaseUrl.replace(/\/$/, '');

  function request(method, path, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${base}/${path}.json`);
      const payload = body !== undefined ? JSON.stringify(body) : undefined;
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method,
          headers: payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {},
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode >= 300) {
              reject(new Error(`Firebase a répondu avec le code ${res.statusCode}: ${data}`));
              return;
            }
            try {
              resolve(data ? JSON.parse(data) : null);
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  return {
    async append(path, item) {
      const result = await request('POST', path, item);
      return { id: result.name, ...item };
    },

    async list(path, options = {}) {
      const limit = options.limit || 20;
      const query = `?orderBy="$key"&limitToLast=${limit}`;
      const result = await request('GET', path + query);
      if (!result) return [];
      return Object.entries(result)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => (a.id < b.id ? -1 : 1));
    },
  };
}

module.exports = { createFirebaseStorage };
