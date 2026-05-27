const bcrypt = require("bcryptjs");
const { customAlphabet } = require("nanoid");
const Note = require("../models/Note");
const { notifyNoteCreated, notifyNoteVisited } = require("../utils/telegram");

// URL-safe alphabet for share IDs
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

// ── Create Note ─────────────────────────────────────────────────────────────

exports.createNote = async (req, res) => {
  try {
    const {
      content = null,
      isPrivate = false,
      password = null,
      expiresIn = null, // hours: 1, 24, 168, null (never)
      creatorFingerprint = null,
    } = req.body;

    // Generate unique shareId
    let shareId, exists;
    do {
      shareId = nanoid();
      exists = await Note.findOne({ shareId }).lean();
    } while (exists);

    // Hash password if private
    let passwordHash = null;
    if (isPrivate && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Calculate expiry
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
    }

    // Extract title from content
    const title = extractTitle(content) || "Untitled Note";
    const textSnapshot = extractText(content);

    const note = await Note.create({
      shareId,
      content,
      title,
      textSnapshot,
      isPrivate,
      passwordHash,
      expiresAt,
      creatorFingerprint,
    });

    // Fire Telegram notification (non-blocking)
    notifyNoteCreated(shareId, isPrivate).catch(() => {});

    res.status(201).json({
      success: true,
      data: {
        shareId: note.shareId,
        title: note.title,
        isPrivate: note.isPrivate,
        expiresAt: note.expiresAt,
        createdAt: note.createdAt,
        editUrl: `/note/${shareId}/edit`,
        shareUrl: `/note/${shareId}`,
        // Return a creator token for edit access (fingerprint-based)
        creatorFingerprint,
      },
    });
  } catch (err) {
    console.error("[createNote]", err);
    res.status(500).json({ success: false, message: "Failed to create note" });
  }
};

// ── Get Note (public) ────────────────────────────────────────────────────────

exports.getNote = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { password, visitorFingerprint } = req.query;

    const note = await Note.findOne({ shareId }).select("+visitorFingerprints");

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    // Check expiry
    if (note.expiresAt && note.expiresAt < new Date()) {
      await Note.deleteOne({ shareId });
      return res.status(410).json({ success: false, message: "Note has expired" });
    }

    // Private note: verify password
    if (note.isPrivate) {
      if (!password) {
        return res.status(401).json({
          success: false,
          message: "This note is password protected",
          requiresPassword: true,
        });
      }
      const valid = await bcrypt.compare(password, note.passwordHash);
      if (!valid) {
        return res.status(403).json({ success: false, message: "Incorrect password" });
      }
    }

    // Track visit
    const isUnique = visitorFingerprint && !note.visitorFingerprints.includes(visitorFingerprint);
    const updateOps = {
      $inc: { "stats.totalVisits": 1, "stats.uniqueVisitors": isUnique ? 1 : 0 },
      $set: { "stats.lastVisitedAt": new Date() },
    };
    if (isUnique) {
      updateOps.$push = { visitorFingerprints: visitorFingerprint };
    }
    await Note.updateOne({ shareId }, updateOps);

    // Notify (throttled in production, always fire here)
    const updatedStats = {
      totalVisits: note.stats.totalVisits + 1,
      uniqueVisitors: note.stats.uniqueVisitors + (isUnique ? 1 : 0),
    };
    notifyNoteVisited(shareId, updatedStats.totalVisits, 0).catch(() => {});

    res.json({
      success: true,
      data: {
        shareId: note.shareId,
        title: note.title,
        content: note.content,
        isPrivate: note.isPrivate,
        expiresAt: note.expiresAt,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        stats: updatedStats,
      },
    });
  } catch (err) {
    console.error("[getNote]", err);
    res.status(500).json({ success: false, message: "Failed to fetch note" });
  }
};

// ── Update Note ──────────────────────────────────────────────────────────────

exports.updateNote = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { content, creatorFingerprint, password, isPrivate, _privacyUpdate } = req.body;

    const note = await Note.findOne({ shareId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    // Verify creator ownership
    if (note.creatorFingerprint && note.creatorFingerprint !== creatorFingerprint) {
      if (note.isPrivate && password) {
        const valid = await bcrypt.compare(password, note.passwordHash);
        if (!valid) {
          return res.status(403).json({ success: false, message: "Not authorized to edit" });
        }
      } else {
        return res.status(403).json({ success: false, message: "Not authorized to edit" });
      }
    }

    // Privacy-only update (from ShareModal)
    if (_privacyUpdate) {
      const updateFields = { isPrivate: !!isPrivate };
      if (isPrivate && password) {
        updateFields.passwordHash = await bcrypt.hash(password, 10);
      } else if (!isPrivate) {
        updateFields.passwordHash = null;
      }
      await Note.updateOne({ shareId }, { $set: updateFields });
      return res.json({ success: true, data: { shareId, isPrivate: !!isPrivate, updatedAt: new Date() } });
    }

    // Save history snapshot (keep last 10)
    const historyEntry = { savedAt: new Date(), textSnapshot: note.textSnapshot };
    const history = [...(note.editHistory || []), historyEntry].slice(-10);

    const title = extractTitle(content) || note.title;
    const textSnapshot = extractText(content);

    await Note.updateOne(
      { shareId },
      {
        $set: {
          content,
          title,
          textSnapshot,
          editHistory: history,
        },
      }
    );

    res.json({
      success: true,
      data: { shareId, title, updatedAt: new Date() },
    });
  } catch (err) {
    console.error("[updateNote]", err);
    res.status(500).json({ success: false, message: "Failed to update note" });
  }
};

// ── Delete Note ──────────────────────────────────────────────────────────────

exports.deleteNote = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { creatorFingerprint } = req.body;

    const note = await Note.findOne({ shareId });
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    if (note.creatorFingerprint && note.creatorFingerprint !== creatorFingerprint) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await Note.deleteOne({ shareId });
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    console.error("[deleteNote]", err);
    res.status(500).json({ success: false, message: "Failed to delete note" });
  }
};

// ── Get Stats ────────────────────────────────────────────────────────────────

exports.getNoteStats = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { creatorFingerprint } = req.query;

    const note = await Note.findOne({ shareId }).lean();
    if (!note) return res.status(404).json({ success: false, message: "Note not found" });

    if (note.creatorFingerprint && note.creatorFingerprint !== creatorFingerprint) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({
      success: true,
      data: {
        shareId,
        stats: note.stats,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        expiresAt: note.expiresAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(content) {
  if (!content) return null;
  if (typeof content === "string") {
    return content.split("\n")[0].slice(0, 100) || null;
  }
  // TipTap JSON
  try {
    const firstNode = content?.content?.[0];
    if (!firstNode) return null;
    const text = firstNode?.content?.map((n) => n.text || "").join("") || "";
    return text.slice(0, 100) || null;
  } catch {
    return null;
  }
}

function extractText(content) {
  if (!content) return "";
  if (typeof content === "string") return content.slice(0, 500);
  try {
    const walk = (nodes) =>
      nodes
        ?.map((n) => {
          if (n.text) return n.text;
          if (n.content) return walk(n.content);
          return "";
        })
        .join(" ") || "";
    return walk(content?.content).slice(0, 500);
  } catch {
    return "";
  }
}

// ── Global Stats (total lifetime visits across all notes) ────────────────────

exports.getGlobalStats = async (req, res) => {
  try {
    const result = await Note.aggregate([
      {
        $group: {
          _id: null,
          totalVisits: { $sum: "$stats.totalVisits" },
          totalNotes: { $sum: 1 },
          totalUniqueVisitors: { $sum: "$stats.uniqueVisitors" },
        },
      },
    ]);
    const stats = result[0] || { totalVisits: 0, totalNotes: 0, totalUniqueVisitors: 0 };
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch global stats" });
  }
};

// ── Update Slug (custom editable URL ID) ─────────────────────────────────────

exports.updateSlug = async (req, res) => {
  try {
    const { shareId } = req.params;
    const { newSlug, creatorFingerprint } = req.body;

    if (!newSlug) return res.status(400).json({ success: false, message: "newSlug required" });

    // Validate: alphanumeric + hyphens, 3-32 chars
    if (!/^[a-zA-Z0-9-_]{3,32}$/.test(newSlug)) {
      return res.status(400).json({
        success: false,
        message: "Slug must be 3-32 chars, letters/numbers/hyphens only",
      });
    }

    const note = await Note.findOne({ shareId });
    if (!note) return res.status(404).json({ success: false, message: "Note not found" });

    if (note.creatorFingerprint && note.creatorFingerprint !== creatorFingerprint) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Check new slug not taken
    const taken = await Note.findOne({ shareId: newSlug }).lean();
    if (taken) return res.status(409).json({ success: false, message: "Slug already taken" });

    await Note.updateOne({ shareId }, { $set: { shareId: newSlug } });

    res.json({ success: true, data: { shareId: newSlug } });
  } catch (err) {
    console.error("[updateSlug]", err);
    res.status(500).json({ success: false, message: "Failed to update slug" });
  }
};
