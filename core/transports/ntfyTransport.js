const https = require('https');

const HOST = 'ntfy.sh';
const RECONNECT_DELAY_MS = 2000;

function connect(topic, onMessage, onError) {
  let closed = false;
  let currentRequest = null;

  function loop() {
    if (closed) return;
    currentRequest = https.request(
      { hostname: HOST, path: '/' + encodeURIComponent(topic) + '/json', method: 'GET' },
      (res) => {
        let buffer = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          buffer += chunk;
          let idx;
          while ((idx = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            let obj;
            try {
              obj = JSON.parse(line);
            } catch (e) {
              continue;
            }
            if (obj.event === 'message' && typeof obj.message === 'string') {
              onMessage(obj.message);
            }
          }
        });
        res.on('end', () => {
          if (!closed) setTimeout(loop, RECONNECT_DELAY_MS);
        });
      }
    );
    currentRequest.on('error', (err) => {
      if (!closed) {
        onError(err);
        setTimeout(loop, RECONNECT_DELAY_MS);
      }
    });
    currentRequest.end();
  }

  loop();

  return {
    close() {
      closed = true;
      if (currentRequest) currentRequest.destroy();
    },
  };
}

function send(topic, rawString) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: HOST,
        path: '/' + encodeURIComponent(topic),
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Length': Buffer.byteLength(rawString),
        },
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          if (res.statusCode >= 300) {
            reject(new Error(`ntfy a répondu avec le code ${res.statusCode}`));
          } else {
            resolve();
          }
        });
      }
    );
    req.on('error', reject);
    req.write(rawString);
    req.end();
  });
}

module.exports = { connect, send };
