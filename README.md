# NoteShare Backend

Real-time collaborative notes with public/private sharing, visit tracking, and Telegram notifications.

## Tech Stack
- **Node.js + Express** — REST API
- **Socket.io** — Real-time collaboration + presence
- **MongoDB (Mongoose)** — Persistent storage
- **bcryptjs** — Password hashing for private notes
- **nanoid** — Short unique share IDs
- **Telegram Bot API** — Owner notifications

---

## Quick Start

```bash
cp .env.example .env
# Fill in your values (see Environment Variables below)
npm install
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5000) |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret for signing tokens |
| `CLIENT_URL` | ✅ | Frontend URL(s), comma-separated |
| `TELEGRAM_BOT_TOKEN` | No | From @BotFather |
| `TELEGRAM_CHAT_ID` | No | Your personal chat ID |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window (default 15 min) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default 200) |

---

## Telegram Setup (2 minutes)

1. Message **@BotFather** on Telegram → `/newbot` → get token
2. Message **@userinfobot** on Telegram → get your chat ID
3. Add both to `.env`

You'll get notified:
- 📝 New note created
- 👀 Someone visits a note
- ✏️ A note is edited
- 🟢 Users go active on a note

---

## API Reference

### Notes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/notes` | Create a new note |
| `GET` | `/api/notes/:shareId` | Read a note |
| `PATCH` | `/api/notes/:shareId` | Update note content |
| `DELETE` | `/api/notes/:shareId` | Delete note |
| `GET` | `/api/notes/:shareId/stats` | Get visit stats (creator only) |

### POST `/api/notes`

```json
{
  "content": { /* TipTap JSON or plain string */ },
  "isPrivate": false,
  "password": "optional-if-private",
  "expiresIn": 24,           // hours, null = never
  "creatorFingerprint": "uuid-stored-in-browser"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "shareId": "aB3xZ9Kw",
    "shareUrl": "/note/aB3xZ9Kw",
    "editUrl": "/note/aB3xZ9Kw/edit",
    "isPrivate": false,
    "expiresAt": null
  }
}
```

### GET `/api/notes/:shareId`

Query params:
- `password` — required if private
- `visitorFingerprint` — UUID for unique visitor tracking

---

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `note:change` | `{ content, version }` | Broadcast content change |
| `cursor:move` | `{ cursor }` | Broadcast cursor position |
| `note:request` | — | Request current saved content |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `note:update` | `{ content, version, from, fromName }` | Content update from peer |
| `cursor:update` | `{ socketId, displayName, cursor }` | Peer cursor moved |
| `presence:update` | `{ users, count }` | Room presence changed |
| `note:current` | `{ content, title, updatedAt }` | Current note on join |

### Connection

```js
const socket = io("http://localhost:5000", {
  query: {
    shareId: "aB3xZ9Kw",
    fingerprint: "user-uuid",
    displayName: "Optional Name"
  }
});
```

---

## Deployment

### Render (recommended)

1. Push to GitHub
2. New Web Service → connect repo
3. Build: `npm install`, Start: `npm start`
4. Add env vars in dashboard

### Railway

```bash
railway login
railway init
railway up
```

---

## Project Structure

```
src/
├── index.js              # App entry point
├── models/
│   └── Note.js           # MongoDB schema
├── controllers/
│   └── noteController.js # CRUD logic
├── routes/
│   └── notes.js          # Express routes
├── socket/
│   └── index.js          # Socket.io + presence
├── middleware/
│   └── errorHandler.js   # Global error handling
└── utils/
    ├── db.js             # MongoDB connection
    └── telegram.js       # Notification helpers
```
