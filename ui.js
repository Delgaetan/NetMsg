const ANSI = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', brightCyan: '\x1b[96m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', magenta: '\x1b[35m', blue: '\x1b[34m',
  brightMagenta: '\x1b[95m', brightYellow: '\x1b[93m', brightGreen: '\x1b[92m',
};

const NAME_PALETTE = [
  ANSI.cyan, ANSI.magenta, ANSI.yellow, ANSI.green,
  ANSI.blue, ANSI.brightCyan, ANSI.brightMagenta, ANSI.brightYellow,
];

function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return NAME_PALETTE[hash % NAME_PALETTE.length];
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

const isInteractive = Boolean(process.stdout.isTTY);

const BANNER_WIDE = [
  ' _   _ _____ _____ __  __ ____   ____ ',
  '| \\ | | ____|_   _|  \\/  / ___| / ___|',
  '|  \\| |  _|   | | | |\\/| \\___ \\| |  _ ',
  '| |\\  | |___  | | | |  | |___) | |_| |',
  '|_| \\_|_____| |_| |_|  |_|____/ \\____|',
];

async function playIntro() {
  if (!isInteractive) return;
  const width = process.stdout.columns || 80;
  if (width < 42) {
    console.log(ANSI.bold + ANSI.brightCyan + '»» netmsg ««' + ANSI.reset);
    await sleep(150);
    return;
  }
  for (const line of BANNER_WIDE) {
    console.log(ANSI.bold + ANSI.brightCyan + line + ANSI.reset);
    await sleep(50);
  }
  console.log(ANSI.dim + '  messagerie sans serveur, sans port forwarding' + ANSI.reset);
  await sleep(150);
}

function startSpinner(label) {
  if (!isInteractive) {
    console.log(label);
    return { stop(finalLine) { if (finalLine) console.log(finalLine); } };
  }
  const frames = ['|', '/', '-', '\\'];
  let i = 0;
  const interval = setInterval(() => {
    i = (i + 1) % frames.length;
    process.stdout.write(`\r${ANSI.cyan}${frames[i]}${ANSI.reset} ${label}`);
  }, 100);
  return {
    stop(finalLine) {
      clearInterval(interval);
      process.stdout.write('\r\x1b[2K');
      if (finalLine) console.log(finalLine);
    },
  };
}

function clearScreen() {
  if (!isInteractive) return;
  process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
}

function bell() {
  if (!isInteractive) return;
  process.stdout.write('\x07');
}

module.exports = { ANSI, colorForName, playIntro, startSpinner, isInteractive, sleep, clearScreen, bell };
