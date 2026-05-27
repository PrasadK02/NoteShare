const Note = require("../models/Note");
const { notifyNoteEdited, notifyActiveUsers } = require("../utils/telegram");

// In-memory presence map: { shareId: Set<socketId> }
const roomPresence = new Map();

// Debounce save: { shareId: timeoutId }
const saveDebouncers = new Map();
// Debounce telegram: { shareId: timeoutId }
const telegramDebouncers = new Map();

module.exports = function setupSocket(io) {
  io.on("connection", (socket) => {
    const { shareId, fingerprint, displayName } = socket.handshake.query;

    if (!shareId) {
      socket.disconnect();
      return;
    }

    // ── Join Room ──────────────────────────────────────────────────────────
    socket.join(shareId);

    if (!roomPresence.has(shareId)) {
      roomPresence.set(shareId, new Map());
    }

    const room = roomPresence.get(shareId);
    room.set(socket.id, {
      fingerprint: fingerprint || "anon",
      displayName: displayName || randomAnimalName(),
      joinedAt: Date.now(),
      cursor: null,
    });

    // Broadcast updated presence to room
    broadcastPresence(io, shareId, room);

    // Notify Telegram (debounced 30s) when active users change
    debounceTelegramNotify(shareId, room.size, 30000);

    console.log(`[Socket] ${socket.id} joined note:${shareId} | room size: ${room.size}`);

    // ── Content Sync ───────────────────────────────────────────────────────
    // Received from editor on every keystroke
    socket.on("note:change", ({ content, version }) => {
      // Broadcast to everyone EXCEPT sender
      socket.to(shareId).emit("note:update", {
        content,
        version,
        from: socket.id,
        fromName: room.get(socket.id)?.displayName,
      });

      // Debounce DB save (save 2s after last keystroke)
      debounce(saveDebouncers, shareId, () => persistNote(shareId, content), 2000);

      // Debounce Telegram edit notify (60s cooldown per note)
      debounce(telegramDebouncers, `edit:${shareId}`, () => notifyNoteEdited(shareId), 60000);
    });

    // ── Cursor Position ────────────────────────────────────────────────────
    socket.on("cursor:move", ({ cursor }) => {
      const user = room.get(socket.id);
      if (user) user.cursor = cursor;
      socket.to(shareId).emit("cursor:update", {
        socketId: socket.id,
        displayName: user?.displayName,
        cursor,
      });
    });

    // ── Request Current Content ────────────────────────────────────────────
    socket.on("note:request", async () => {
      try {
        const note = await Note.findOne({ shareId }).lean();
        if (note) {
          socket.emit("note:current", {
            content: note.content,
            title: note.title,
            updatedAt: note.updatedAt,
          });
        }
      } catch (err) {
        console.error("[Socket] note:request failed", err);
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          roomPresence.delete(shareId);
        } else {
          broadcastPresence(io, shareId, room);
        }
      }
      console.log(`[Socket] ${socket.id} left note:${shareId} | room size: ${room?.size ?? 0}`);
    });
  });

  // ── Active Users API ───────────────────────────────────────────────────────
  // Expose getter for REST controllers
  io.getActiveUsers = (shareId) => {
    const room = roomPresence.get(shareId);
    return room ? room.size : 0;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function broadcastPresence(io, shareId, room) {
  const users = Array.from(room.values()).map(({ displayName, cursor, joinedAt }) => ({
    displayName,
    cursor,
    joinedAt,
  }));
  io.to(shareId).emit("presence:update", { users, count: users.length });
}

async function persistNote(shareId, content) {
  try {
    const title = extractTitle(content) || undefined;
    const textSnapshot = extractText(content);
    await Note.updateOne(
      { shareId },
      { $set: { content, textSnapshot, ...(title ? { title } : {}) } }
    );
    console.log(`[Socket] Auto-saved note:${shareId}`);
  } catch (err) {
    console.error("[Socket] Auto-save failed:", err.message);
  }
}

function debounce(map, key, fn, delay) {
  if (map.has(key)) clearTimeout(map.get(key));
  map.set(key, setTimeout(() => { fn(); map.delete(key); }, delay));
}

function debounceTelegramNotify(shareId, count, delay) {
  debounce(telegramDebouncers, `presence:${shareId}`, () => {
    if (count > 0) notifyActiveUsers(shareId, count).catch(() => {});
  }, delay);
}

function extractTitle(content) {
  try {
    if (!content) return null;
    if (typeof content === "string") return content.split("\n")[0].slice(0, 100);
    const text = content?.content?.[0]?.content?.map((n) => n.text || "").join("") || "";
    return text.slice(0, 100) || null;
  } catch { return null; }
}

function extractText(content) {
  try {
    if (!content) return "";
    if (typeof content === "string") return content.slice(0, 500);
    const walk = (nodes) =>
      nodes?.map((n) => (n.text ? n.text : n.content ? walk(n.content) : "")).join(" ") || "";
    return walk(content?.content).slice(0, 500);
  } catch { return ""; }
}

const ANIMALS = ["Panda", "Falcon", "Otter", "Fox", "Wolf", "Lynx", "Bear", "Hawk", "Deer", "Owl"];
const COLORS  = ["Red", "Blue", "Green", "Purple", "Orange", "Teal", "Pink", "Amber"];
function randomAnimalName() {
  const a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const c = COLORS[Math.floor(Math.random() * COLORS.length)];
  return `${c} ${a}`;
}
