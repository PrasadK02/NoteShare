require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");

const connectDB = require("./utils/db");
const noteRoutes = require("./routes/notes");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const setupSocket = require("./socket");

const app = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL?.split(",") || ["http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupSocket(io);

// Make io accessible in controllers via req.app.get("io")
app.set("io", io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(",") || ["http://localhost:5173"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json({ limit: "2mb" })); // TipTap JSON can be sizeable
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
  })
);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    activeRooms: io.sockets.adapter.rooms.size,
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/notes", noteRoutes);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`
🚀 NoteShare backend running
   Port    : ${PORT}
   Env     : ${process.env.NODE_ENV || "development"}
   Mongo   : ${process.env.MONGODB_URI ? "✅ configured" : "❌ missing MONGODB_URI"}
   Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? "✅ configured" : "⚠️  not configured (mock mode)"}
    `);
  });
}

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  server.close(() => process.exit(0));
});
