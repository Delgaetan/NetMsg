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
