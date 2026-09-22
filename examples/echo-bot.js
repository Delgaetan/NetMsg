const { NetMsgClient } = require('../core/NetMsgClient');

const secret = process.argv[2];
if (!secret) {
  console.error('Usage: node echo-bot.js "phrase secrete partagee"');
  process.exit(1);
}

const bot = new NetMsgClient({ secret, name: 'Bot' });

bot.on('connected', () => console.log('Bot connecté, en attente de messages...'));
bot.on('error', (err) => console.error('[erreur]', err.message));

bot.on('message', async (msg) => {
  console.log(`Reçu de ${msg.name} : ${msg.text}`);
  await bot.send(`Tu as dit : "${msg.text}"`);
});

bot.connect();
