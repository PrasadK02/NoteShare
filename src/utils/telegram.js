const fetch = require("node-fetch");

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/**
 * Send a Telegram message to your configured chat.
 * Silently fails if env vars are not set (dev mode).
 */
async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Telegram MOCK] ${message}`);
    }
    return;
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Telegram] Send failed:", err);
    }
  } catch (err) {
    console.error("[Telegram] Network error:", err.message);
  }
}

// ── Notification Templates ──────────────────────────────────────────────────

function notifyNoteCreated(shareId, isPrivate) {
  const type = isPrivate ? "🔒 Private" : "🌐 Public";
  return sendTelegram(
    `📝 <b>New Note Created</b>\n` +
      `${type} note\n` +
      `ID: <code>${shareId}</code>\n` +
      `🔗 View: ${process.env.CLIENT_URL}/note/${shareId}`
  );
}

function notifyNoteVisited(shareId, totalVisits, activeUsers) {
  return sendTelegram(
    `👀 <b>Note Visited</b>\n` +
      `ID: <code>${shareId}</code>\n` +
      `📊 Total visits: ${totalVisits}\n` +
      `🟢 Active now: ${activeUsers}`
  );
}

function notifyNoteEdited(shareId) {
  return sendTelegram(
    `✏️ <b>Note Edited</b>\n` +
      `ID: <code>${shareId}</code>\n` +
      `🔗 ${process.env.CLIENT_URL}/note/${shareId}`
  );
}

function notifyActiveUsers(shareId, count) {
  return sendTelegram(
    `🟢 <b>${count} user${count > 1 ? "s" : ""} active</b> on note <code>${shareId}</code>`
  );
}

module.exports = {
  sendTelegram,
  notifyNoteCreated,
  notifyNoteVisited,
  notifyNoteEdited,
  notifyActiveUsers,
};
