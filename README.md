# netmsg-sdk

Une base de depart pour construire sa propre messagerie texte, sans serveur
a heberger ni port a ouvrir. Le projet est decoupe en une librairie (le
moteur) et des interfaces (des facons de l'utiliser), pour que n'importe
qui puisse construire sa propre interface par-dessus sans toucher au
coeur du systeme.

Structure :
- core/NetMsgClient.js   -> le coeur : a utiliser tel quel dans vos projets
- core/crypto.js          -> schema de chiffrement par defaut (remplacable)
- core/transports/ntfyTransport.js -> transport par defaut : relais public ntfy.sh (remplacable)
- ui.js                   -> couleurs, animation, spinner (purement visuel)
- cli.js                  -> interface n1 : chat dans le terminal (exemple de reference)
- examples/echo-bot.js    -> interface n2 : un bot automatique
- examples/memoryTransport.js -> exemple de transport alternatif (pour tester / s'inspirer)

## Comment ca marche, en une phrase

Une phrase secrete partagee determine a la fois OU les messages sont
echanges (un identifiant de salon derive par hachage) et COMMENT ils
sont proteges (une cle de chiffrement AES-256 derivee de la meme phrase).
Aucune IP, aucun compte, aucun port a ouvrir : tout le monde ne fait que
des requetes sortantes vers un relais public (ntfy.sh par defaut).

## Utiliser le coeur dans votre propre projet

    const { NetMsgClient } = require('./core/NetMsgClient');

    const client = new NetMsgClient({
      secret: 'notre phrase secrete',
      name: 'Alice',
    });

    client.on('connected', () => console.log('Pret'));
    client.on('message', (msg) => console.log(msg.name, ':', msg.text));
    client.on('error', (err) => console.error(err));

    client.connect();
    client.send('Salut !');
    // plus tard :
    client.disconnect();

## Remplacer le transport

Le transport est isole dans core/transports/. Son role est unique :
acheminer une chaine de caracteres deja chiffree d'un point A a un point
B. Pour en ecrire un autre (WebSocket, MQTT, votre propre serveur relais,
etc.), il suffit de fournir un objet avec cette interface :

    {
      connect(topic, onMessage, onError) {
        // s'abonner a topic, appeler onMessage(rawString) pour chaque
        // message recu, onError(err) en cas de probleme.
        // retourne { close() { ... } }
      },
      send(topic, rawString) {
        // retourne une Promise qui se resout une fois le message transmis
      }
    }

examples/memoryTransport.js est un exemple minimal (tout en memoire,
utile pour tester sans reseau) qui montre bien la forme attendue.

## Remplacer le chiffrement

Meme logique dans core/crypto.js. L'interface attendue :

    {
      deriveTopic(secret, prefix) { /* retourne un nom de salon */ },
      deriveKey(secret) { /* retourne une cle */ },
      encrypt(key, plaintext) { /* retourne une chaine chiffree */ },
      decrypt(key, ciphertext) { /* retourne le texte original */ },
    }

## Idees pour aller plus loin

- Salons multiples, historique local, pieces jointes, presence en ligne,
  groupes a plusieurs (ca fonctionne deja : tout le monde avec la meme
  phrase secrete est dans le meme salon).

## Securite, pour rester honnete

- Le relais (ntfy.sh par defaut) voit passer des messages chiffres, mais
  voit aussi le nom du salon et le moment ou des messages transitent.
- La phrase secrete est votre seule protection : plus elle est longue et
  peu devinable, mieux c'est.
- Ce projet est une base pedagogique et pour un usage entre personnes de
  confiance, pas un remplacant a des messageries chiffrees de bout en
  bout auditees (Signal, etc.).

## Stockage persistant (optionnel)

Tout ce qui précède fonctionne sans rien d'autre que Node.js : `cli.js`
marche tel quel avec seulement ntfy.sh, sans inscription ni clé API.

Le SDK inclut EN PLUS un module de stockage persistant
(`core/PostStore.js` + `core/storage/`), utile si vous voulez aller
au-delà d'un chat éphémère (par exemple un fil d'actu, des profils, un
historique qui survit après avoir fermé le programme). **Ce n'est pas
obligatoire** - c'est une brique à ajouter uniquement si vous en avez
besoin.

Contrairement à ntfy.sh (rien à créer, complètement anonyme), le
stockage persistant demande de créer un compte gratuit sur un service
externe et de récupérer une clé API :

- `core/storage/firebaseStorage.js` - via Firebase Realtime Database
  (compte Google)
- `core/storage/jsonbinStorage.js` - via jsonbin.io (compte + clé API,
  et idéalement une "Access Key" limitée plutôt que la clé principale
  du compte si la clé doit être partagée avec quelqu'un d'autre)

Voir les commentaires en haut de chacun de ces deux fichiers pour la
mise en place complète (création de compte, récupération de la clé,
création d'un premier bin/projet).

Exemples d'utilisation, combinant ce stockage avec `NetMsgClient` (le
stockage garde les données, ntfy.sh prévient instantanément qu'il y a
du nouveau) :
- `examples/mini-feed.js` (avec Firebase)
- `examples/mini-feed-jsonbin.js` (avec jsonbin.io)

## Transport navigateur (optionnel)

Par defaut, `core/transports/ntfyTransport.js` utilise le module
`https` de Node.js et ne fonctionne donc que cote serveur (Termux,
CLI, bot...). `core/transports/browserNtfyTransport.js` est une
alternative qui fait exactement la meme chose avec des API 100%
navigateur (`fetch` + `EventSource`), pour brancher un chat dans une
page web, une extension ou une PWA. Meme relais (ntfy.sh), meme
protocole : un client Node et un client navigateur peuvent discuter
dans le meme salon sans rien changer d'autre.

```js
const client = new NetMsgClient({
  secret: 'notre phrase secrete',
  transport: browserNtfyTransport, // ou require(...) selon votre setup
});
ok
"
cd ~/netmsg-sdk
cat > core/transports/browserNtfyTransport.js << 'EOF'
const HOST = 'https://ntfy.sh';
const RECONNECT_DELAY_MS = 2000;

function connect(topic, onMessage, onError) {
  let closed = false;
  let source = null;

  function open() {
    if (closed) return;
    source = new EventSource(`${HOST}/${encodeURIComponent(topic)}/sse`);

    source.onmessage = (event) => {
      let obj;
      try {
        obj = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (obj.event === 'message' && typeof obj.message === 'string') {
        onMessage(obj.message);
      }
    };

    source.onerror = (event) => {
      onError(new Error('browserNtfyTransport: connexion SSE interrompue'));
      if (!closed) {
        source.close();
        setTimeout(open, RECONNECT_DELAY_MS);
      }
    };
  }

  open();

  return {
    close() {
      closed = true;
      if (source) source.close();
    },
  };
}

function send(topic, rawString) {
  return fetch(`${HOST}/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: rawString,
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`ntfy a repondu avec le code ${res.status}`);
    }
  });
}

const browserNtfyTransport = { connect, send };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = browserNtfyTransport;
} else if (typeof window !== 'undefined') {
  window.browserNtfyTransport = browserNtfyTransport;
}

## Transport navigateur (optionnel)

Par defaut, `core/transports/ntfyTransport.js` utilise le module
`https` de Node.js et ne fonctionne donc que cote serveur (Termux,
CLI, bot...). `core/transports/browserNtfyTransport.js` est une
alternative qui fait exactement la meme chose avec des API 100%
navigateur (`fetch` + `EventSource`), pour brancher un chat dans une
page web, une extension ou une PWA. Meme relais (ntfy.sh), meme
protocole : un client Node et un client navigateur peuvent discuter
dans le meme salon sans rien changer d'autre.

```js
const client = new NetMsgClient({
  secret: 'notre phrase secrete',
  transport: browserNtfyTransport, // ou require(...) selon votre setup
});"
cd ~/netmsg-sdk
cat > core/transports/browserNtfyTransport.js << 'EOF'
const HOST = 'https://ntfy.sh';
const RECONNECT_DELAY_MS = 2000;

function connect(topic, onMessage, onError) {
  let closed = false;
  let source = null;

  function open() {
    if (closed) return;
    source = new EventSource(`${HOST}/${encodeURIComponent(topic)}/sse`);

    source.onmessage = (event) => {
      let obj;
      try {
        obj = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (obj.event === 'message' && typeof obj.message === 'string') {
        onMessage(obj.message);
      }
    };

    source.onerror = (event) => {
      onError(new Error('browserNtfyTransport: connexion SSE interrompue'));
      if (!closed) {
        source.close();
        setTimeout(open, RECONNECT_DELAY_MS);
      }
    };
  }

  open();

  return {
    close() {
      closed = true;
      if (source) source.close();
    },
  };
}

function send(topic, rawString) {
  return fetch(`${HOST}/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: rawString,
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`ntfy a repondu avec le code ${res.status}`);
    }
  });
}

const browserNtfyTransport = { connect, send };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = browserNtfyTransport;
} else if (typeof window !== 'undefined') {
  window.browserNtfyTransport = browserNtfyTransport;
}

## Sessions (optionnel)

Sessions.js complete Accounts.js : apres un login reussi, on cree un
jeton opaque (un "token") que le client garde de son cote et renvoie
ensuite pour prouver qui il est, sans redemander le mot de passe a
chaque fois.

Exemple :

    const { Accounts } = require('./core/Accounts');
    const { Sessions } = require('./core/Sessions');
    const { memoryStorage } = require('./core/storage/memoryStorage');

    const accounts = new Accounts({ storage: memoryStorage });
    const sessions = new Sessions({ storage: memoryStorage, ttlMs: 1000 * 60 * 60 * 24 * 7 });

    const account = await accounts.login('Bob', 'motdepasse123');
    const token = await sessions.create(account);
    const user = await sessions.validate(token);

Limite connue : sessions.revoke(token) necessite que le backend de
stockage propose une methode remove(path, id). Aucun des backends
fournis (Firebase, jsonbin, memoryStorage) ne l'implemente pour
l'instant - revoke() leve donc une erreur explicite plutot que
d'echouer silencieusement. En attendant, gardez un ttlMs court si
vous avez besoin d'une deconnexion rapide.

## Combinaisons possibles

Tout est optionnel et independant : prenez uniquement ce dont vous
avez besoin.

### 1. Juste le chat (rien d'autre)

    const { NetMsgClient } = require('./core/NetMsgClient');
    const client = new NetMsgClient({ secret: 'phrase secrete', name: 'Alice' });
    client.on('message', (msg) => console.log(msg.name, ':', msg.text));
    client.connect();
    client.send('Salut !');

### 2. Chat + comptes (pseudo/mot de passe, sans base de donnees separee)

    const { Accounts } = require('./core/Accounts');
    const { Sessions } = require('./core/Sessions');
    const { memoryStorage } = require('./core/storage/memoryStorage');
    const { NetMsgClient } = require('./core/NetMsgClient');

    const accounts = new Accounts({ storage: memoryStorage });
    const sessions = new Sessions({ storage: memoryStorage });

    const account = await accounts.login('Alice', 'motdepasse123');
    const token = await sessions.create(account);

    const client = new NetMsgClient({ secret: 'phrase secrete', name: account.username });

### 3. Chat + base de donnees persistante (posts/feed, sans comptes)

    const { PostStore } = require('./core/PostStore');
    const { createFirebaseStorage } = require('./core/storage/firebaseStorage');
    const { NetMsgClient } = require('./core/NetMsgClient');

    const store = new PostStore({ storage: createFirebaseStorage('https://VOTRE-PROJET-default-rtdb.firebaseio.com') });
    await store.post({ author: 'Alice', text: 'Salut', at: Date.now() });
    const feed = await store.feed({ limit: 20 });

    const notifier = new NetMsgClient({ secret: 'phrase secrete', name: 'notifier' });

### 4. Les trois ensemble (comptes + base de donnees + chat)

    const { Accounts } = require('./core/Accounts');
    const { Sessions } = require('./core/Sessions');
    const { PostStore } = require('./core/PostStore');
    const { createFirebaseStorage } = require('./core/storage/firebaseStorage');
    const { NetMsgClient } = require('./core/NetMsgClient');

    const storage = createFirebaseStorage('https://VOTRE-PROJET-default-rtdb.firebaseio.com');
    const accounts = new Accounts({ storage });
    const sessions = new Sessions({ storage });
    const store = new PostStore({ storage });

    const account = await accounts.login('Alice', 'motdepasse123');
    const token = await sessions.create(account);
    await store.post({ author: account.username, text: 'Salut', at: Date.now() });

    const client = new NetMsgClient({ secret: 'phrase secrete', name: account.username });

Chaque brique accepte n'importe quel backend de stockage
(memoryStorage pour tester, firebaseStorage ou jsonbinStorage pour
persister). On peut aussi melanger : Accounts sur Firebase et
PostStore sur jsonbin par exemple, rien ne les oblige a partager le
meme backend.

## Messages directs par pseudo (optionnel)

DirectMessage.js permet d'ecrire a quelqu'un juste en connaissant son
pseudo (via Accounts.search()), sans se mettre d'accord au prealable
sur une phrase secrete commune.

Exemple :

    const { Accounts } = require('./core/Accounts');
    const { createDirectClient } = require('./core/DirectMessage');
    const { memoryStorage } = require('./core/storage/memoryStorage');

    const accounts = new Accounts({ storage: memoryStorage });

    const found = await accounts.search('alice');
    if (found) {
      const client = createDirectClient({ toUsername: found.username, myUsername: 'Bob' });
      client.on('message', (msg) => console.log(msg.name, ':', msg.text));
      client.connect();
      client.send('Salut Alice !');
    }

ATTENTION - limite importante a comprendre avant d'utiliser ce
module : le "secret" du salon se calcule directement a partir du
pseudo, qui est par definition cherchable. N'IMPORTE QUI connaissant
ce pseudo peut calculer le meme salon et la meme cle de dechiffrement.
Ca protege le contenu des messages du regard du relais (ntfy.sh voit
toujours du texte chiffre), mais PAS d'un autre utilisateur du SDK
qui chercherait aussi ce pseudo. C'est donc plus proche d'une "boite
de reception publique par pseudo" que d'un vrai message prive au sens
strict. Pour une confidentialite garantie entre deux personnes
precises, utilisez toujours NetMsgClient avec une phrase secrete que
seules ces deux personnes connaissent.

## Messages directs par pseudo (optionnel)

DirectMessage.js permet d'ecrire a quelqu'un juste en connaissant son
pseudo (via Accounts.search()), sans se mettre d'accord au prealable
sur une phrase secrete commune.

Exemple :

    const { Accounts } = require('./core/Accounts');
    const { createDirectClient } = require('./core/DirectMessage');
    const { memoryStorage } = require('./core/storage/memoryStorage');

    const accounts = new Accounts({ storage: memoryStorage });

    const found = await accounts.search('alice');
    if (found) {
      const client = createDirectClient({ toUsername: found.username, myUsername: 'Bob' });
      client.on('message', (msg) => console.log(msg.name, ':', msg.text));
      client.connect();
      client.send('Salut Alice !');
    }

ATTENTION - limite importante a comprendre avant d'utiliser ce
module : le "secret" du salon se calcule directement a partir du
pseudo, qui est par definition cherchable. N'IMPORTE QUI connaissant
ce pseudo peut calculer le meme salon et la meme cle de dechiffrement.
Ca protege le contenu des messages du regard du relais (ntfy.sh voit
toujours du texte chiffre), mais PAS d'un autre utilisateur du SDK
qui chercherait aussi ce pseudo. C'est donc plus proche d'une "boite
de reception publique par pseudo" que d'un vrai message prive au sens
strict. Pour une confidentialite garantie entre deux personnes
precises, utilisez toujours NetMsgClient avec une phrase secrete que
seules ces deux personnes connaissent.
