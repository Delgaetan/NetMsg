const readline = require('readline');
const { NetMsgClient } = require('./core/NetMsgClient');
const { ANSI, colorForName, playIntro, startSpinner, isInteractive, clearScreen, bell } = require('./ui');

const argv = process.argv.slice(2);
if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
  console.log(`
netmsg - messagerie texte en ligne de commande (sans port forwarding)

Usage :
  node cli.js "phrase secrete partagee" [--name "pseudo"]

Commandes disponibles pendant la conversation :
  /clear   efface l'écran (sans couper la connexion)
  /help    rappelle ces commandes
  /quit    quitte proprement
`);
  process.exit(0);
}

const secret = argv[0];
let name = 'anonyme';
for (let i = 1; i < argv.length; i++) {
  if (argv[i] === '--name' || argv[i] === '-n') name = argv[++i];
}

const myColor = colorForName(name);
const client = new NetMsgClient({ secret, name });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const promptText = isInteractive
  ? `${myColor}${ANSI.bold}${name}${ANSI.reset} > `
  : `${name} > `;
rl.setPrompt(promptText);

function timestamp() {
  const d = new Date();
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function quit() {
  console.log(isInteractive ? `${ANSI.dim}À bientôt !${ANSI.reset}` : 'À bientôt !');
  client.disconnect();
  process.exit(0);
}

process.on('SIGINT', quit);

async function main() {
  clearScreen();
  await playIntro();
  const spinner = startSpinner('Connexion au salon...');

  client.on('connected', () => {
    spinner.stop(
      isInteractive
        ? `${ANSI.green}✓${ANSI.reset} Connecté ${ANSI.dim}(Ctrl+C ou /quit pour arrêter, /help pour l'aide)${ANSI.reset}`
        : "Connecté (Ctrl+C ou /quit pour arrêter, /help pour l'aide)"
    );
    rl.prompt();
  });

  client.on('message', (msg) => {
    bell();
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    if (isInteractive) {
      const color = colorForName(msg.name);
      console.log(`${ANSI.dim}[${timestamp()}]${ANSI.reset} ${ANSI.bold}${color}${msg.name}${ANSI.reset} ${msg.text}`);
    } else {
      console.log(`[${timestamp()}] ${msg.name}: ${msg.text}`);
    }
    rl.prompt(true);
  });

  client.on('error', (err) => {
    console.error(`\n${isInteractive ? ANSI.red + '[erreur]' + ANSI.reset : '[erreur]'} ${err.message}`);
  });

  rl.on('line', (line) => {
    const text = line.trim();
    if (text === '/quit') return quit();
    if (text === '/clear') { clearScreen(); rl.prompt(); return; }
    if (text === '/help') {
      console.log(
        isInteractive
          ? `${ANSI.dim}/clear efface l'écran · /help cette aide · /quit quitte proprement${ANSI.reset}`
          : "/clear efface l'écran · /help cette aide · /quit quitte proprement"
      );
      rl.prompt();
      return;
    }
    if (text) client.send(text).catch(() => {});
    rl.prompt();
  });

  client.connect();
}

main();
