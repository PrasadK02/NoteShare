const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const ctrl = require("../controllers/noteController");

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many notes created. Try again later." },
});

const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { success: false, message: "Too many requests. Slow down!" },
});

// GET    /api/notes/stats/global  → Lifetime stats
router.get("/stats/global", ctrl.getGlobalStats);

// POST   /api/notes               → Create note
router.post("/", createLimiter, ctrl.createNote);

// GET    /api/notes/:shareId      → Read note
router.get("/:shareId", readLimiter, ctrl.getNote);

// PATCH  /api/notes/:shareId      → Update content
router.patch("/:shareId", ctrl.updateNote);

// PATCH  /api/notes/:shareId/slug → Rename slug (editable URL)
router.patch("/:shareId/slug", ctrl.updateSlug);

// DELETE /api/notes/:shareId      → Delete
router.delete("/:shareId", ctrl.deleteNote);

// GET    /api/notes/:shareId/stats → Analytics
router.get("/:shareId/stats", ctrl.getNoteStats);

module.exports = router;
