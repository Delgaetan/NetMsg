const https = require('https');

const API_ROOT = 'api.jsonbin.io';

function request(method, headers, route, body) {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: API_ROOT,
        path: `/v3${route}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 300) {
            reject(new Error(`jsonbin.io a répondu avec le code ${res.statusCode}: ${data}`));
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

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createBin(masterKey, name) {
  const result = await request('POST', { 'X-Master-Key': masterKey }, '/b', { items: [] });
  if (name) {
    await request('PUT', { 'X-Master-Key': masterKey }, `/b/${result.metadata.id}/meta/name`, {});
  }
  return result.metadata.id;
}

function createJsonbinStorage({ apiKey, accessKey, bins }) {
  if (!apiKey && !accessKey) {
    throw new Error('jsonbinStorage: fournissez "apiKey" (Master Key) ou "accessKey" (Access Key)');
  }
  const authHeaders = accessKey ? { 'X-Access-Key': accessKey } : { 'X-Master-Key': apiKey };

  function binIdFor(path) {
    const id = bins[path];
    if (!id) {
      throw new Error(
        `jsonbinStorage: aucun bin configuré pour "${path}". Créez-en un avec createBin() ` +
          `et ajoutez-le à l'option "bins" (voir le commentaire en haut de ce fichier).`
      );
    }
    return id;
  }

  return {
    async append(path, item) {
      const binId = binIdFor(path);
      const current = await request('GET', authHeaders, `/b/${binId}`);
      const items = (current && current.record && current.record.items) || [];
      const stored = { id: generateId(), ...item };
      items.push(stored);
      await request('PUT', authHeaders, `/b/${binId}`, { items });
      return stored;
    },

    async list(path, options = {}) {
      const limit = options.limit || 20;
      const binId = binIdFor(path);
      const current = await request('GET', authHeaders, `/b/${binId}`);
      const items = (current && current.record && current.record.items) || [];
      return items.slice(-limit);
    },
  };
}

module.exports = { createJsonbinStorage, createBin };
