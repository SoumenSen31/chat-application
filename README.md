# chat-application# Cipher Line — Live

A real, working end-to-end encrypted chat for two people, over the actual internet.

- **Server** (`server.js`): a ~70-line WebSocket relay. It pairs two connections
  that use the same room code and forwards messages between them. It never sees
  plaintext, never holds a decryption key, and stores nothing to disk.
- **Client** (`public/index.html`): a single self-contained page. It generates
  a fresh ECDH (P-256) key pair per session, exchanges public keys with your
  friend through the relay, derives a shared AES-256-GCM key, and encrypts
  every message locally before it ever reaches the server.

## 1. Run it locally first

```bash
npm install
npm start
```

Open `http://localhost:8080` in two separate browser tabs (or on two devices on
the same Wi-Fi, using your computer's local IP instead of `localhost`). Use the
same room code in both, click Connect on both, and chat.

## 2. Try it with a friend right now, without deploying

Install [ngrok](https://ngrok.com) (free) on your machine, then:

```bash
npm start
# in a second terminal:
ngrok http 8080
```

ngrok gives you a temporary public `https://...ngrok-free.app` URL. Send that
URL plus a room code to your friend — anyone who opens the URL and enters the
same room code can connect. This is the fastest way to test with someone who
isn't on your network, but the URL stops working when you close ngrok.

## 3. Deploy it permanently (free tier)

**Render.com** is the simplest option:

1. Push this folder to a GitHub repo.
2. On Render, click **New → Web Service**, connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Deploy. Render gives you a permanent `https://your-app.onrender.com` URL
   with HTTPS/WSS already set up — the client auto-detects this and needs no
   configuration.

Railway.app and Fly.io work the same way (Node web service, `npm start`).
Note: free tiers on these platforms typically sleep after inactivity, so the
first connection after a while may take a few seconds to wake up.

## 3. Chat with your friend

Once deployed, open `https://your-app.onrender.com`. Click **New code** to get
a room code (e.g. `ember-quartz-42`), or use **Copy invite link** — the room
code travels in the URL as `?room=...`. Send that link (or just the code) to
your friend through any channel: text, email, whatever. Both of you open the
URL, both click Connect, and once the second person joins, keys are exchanged
and the chat unlocks.

**Verify the safety number.** After connecting, both of you will see a "safety
number" — a fingerprint of the combined public keys. Read it to each other
over a phone call or in person, *not* through the chat itself. If it matches,
your connection is genuinely private; if it doesn't, someone is intercepting
the key exchange. This is the same idea Signal calls a "safety number" and
WhatsApp calls a "security code."

## What this is and isn't

**Real:** the ECDH key exchange, the AES-256-GCM encryption, and the fact that
the server only ever relays ciphertext — you can expand "What the relay server
actually sees" in the client to watch this happen live.

**Not included** (all realistic next steps if you want to keep building):
- **Persistence.** Nothing is saved. Refresh the page and history is gone;
  there's no offline delivery if one person isn't currently connected.
- **Forward secrecy per message.** The session key stays the same for the
  whole conversation rather than rotating with each message (a "ratchet,"
  as in the Signal protocol).
- **More than two people per room.** The relay rejects a third joiner.
- **Identity verification beyond the safety number.** There's no persistent
  identity key across sessions — a new key pair is generated every time you
  connect, so the safety number changes each session too.