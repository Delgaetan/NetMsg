const readline = require('readline');
const { createDirectClient } = require('../core/DirectMessage');

const [, , myUsername, toUsername] = process.argv;

if (!myUsername || !toUsername) {
  console.log('Usage: node examples/dm-demo.js "MonPseudo" "PseudoDestinataire"');
  process.exit(1);
}

const client = createDirectClient({ toUsername, myUsername });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.setPrompt(`${myUsername} > `);

client.on('connected', () => {
  console.log(`Connecte au salon de "${toUsername}" (Ctrl+C pour arreter)`);
  rl.prompt();
});

client.on('message', (msg) => {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  console.log(`${msg.name}: ${msg.text}`);
  rl.prompt(true);
});

client.on('error', (err) => console.error(`\n[erreur] ${err.message}`));

rl.on('line', (line) => {
  const text = line.trim();
  if (text) client.send(text).catch(() => {});
  rl.prompt();
});

client.connect();
