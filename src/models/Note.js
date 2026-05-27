const mongoose = require("mongoose");

const NoteSchema = new mongoose.Schema(
  {
    // Short shareable ID (e.g. "aB3xZ9")
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Note content (TipTap JSON or plain text)
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: { type: "doc", content: [{ type: "paragraph" }] },
    },

    // Plain text snapshot for search/preview
    textSnapshot: {
      type: String,
      default: "",
      maxlength: 500,
    },

    // Title derived from first line
    title: {
      type: String,
      default: "Untitled Note",
      maxlength: 200,
    },

    // Privacy
    isPrivate: {
      type: Boolean,
      default: false,
    },

    // Hashed password for private notes
    passwordHash: {
      type: String,
      default: null,
    },

    // Expiry (null = never expires)
    expiresAt: {
      type: Date,
      default: null,
    },

    // Creator fingerprint (no login needed – browser-generated UUID stored in localStorage)
    creatorFingerprint: {
      type: String,
      default: null,
    },

    // Analytics
    stats: {
      totalVisits: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
      lastVisitedAt: { type: Date, default: null },
    },

    // Visitor fingerprints for unique count
    visitorFingerprints: {
      type: [String],
      default: [],
      select: false, // Don't return in normal queries
    },

    // Edit history snapshot (last 10 saves)
    editHistory: {
      type: [
        {
          savedAt: Date,
          textSnapshot: String,
        },
      ],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// TTL index: auto-delete expired notes
NoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Index for creator lookup
NoteSchema.index({ creatorFingerprint: 1 });

module.exports = mongoose.model("Note", NoteSchema);
