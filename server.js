// Cipher Line relay server.
// This process only ever sees: a room code, and whatever JSON messages the
// two connected clients choose to relay to each other (public keys and
// AES-GCM ciphertext). It never sees plaintext, never sees a private key,
// and stores nothing to disk. Restarting it forgets every room instantly.

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? '/index.html' : urlPath);

  // guard against path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });
const rooms = new Map(); // roomCode -> Set<ws>

function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws) => {
  ws.room = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // ignore malformed frames
    }

    if (msg.type === 'join') {
      const room = String(msg.room || '').trim().slice(0, 64);
      if (!room) return send(ws, { type: 'error', message: 'Room code required' });

      let peers = rooms.get(room);
      if (!peers) {
        peers = new Set();
        rooms.set(room, peers);
      }
      if (peers.size >= 2) {
        return send(ws, { type: 'error', message: 'That room already has two people in it' });
      }

      peers.add(ws);
      ws.room = room;
      send(ws, { type: 'joined', room, peerPresent: peers.size === 2 });
      for (const peer of peers) {
        if (peer !== ws) send(peer, { type: 'peer-joined' });
      }
      return;
    }

    // Anything else (pubkey exchange, ciphertext messages) is relayed
    // verbatim to the other peer in the room. The server does not
    // interpret, log, or store the contents.
    if (!ws.room) return;
    const peers = rooms.get(ws.room);
    if (!peers) return;
    for (const peer of peers) {
      if (peer !== ws) send(peer, msg);
    }
  });

  ws.on('close', () => {
    if (!ws.room) return;
    const peers = rooms.get(ws.room);
    if (!peers) return;
    peers.delete(ws);
    for (const peer of peers) send(peer, { type: 'peer-left' });
    if (peers.size === 0) rooms.delete(ws.room);
  });
});

server.listen(PORT, () => {
  console.log(`Cipher Line relay listening on :${PORT}`);
});