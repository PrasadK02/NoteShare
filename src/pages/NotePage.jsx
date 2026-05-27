import React, { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";
import { io } from "socket.io-client";
import { api } from "../utils/api";
import { getFingerprint } from "../utils/fingerprint";
import {
  setNote,
  toggleShareModal,
  setActiveUsers,
  setSavedAt,
  setIsSaving,
  setStatus,
} from "../store";
import ShareModal from "../components/ShareModal";
import styles from "./NotePage.module.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "";

export default function NotePage() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const note = useSelector((s) => s.notes.current);
  const shareModalOpen = useSelector((s) => s.ui.shareModalOpen);
  const activeUsers = useSelector((s) => s.ui.activeUsers);
  const savedAt = useSelector((s) => s.ui.savedAt);
  const isSaving = useSelector((s) => s.ui.isSaving);
  const status = useSelector((s) => s.notes.status);

  const socketRef = useRef(null);
  const saveTimer = useRef(null);
  const isRemoteUpdate = useRef(false);
  const fp = getFingerprint();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: "Start writing your note..." }),
      CharacterCount,
    ],
    content: "",
    onUpdate({ editor }) {
      if (isRemoteUpdate.current) return;
      const content = editor.getJSON();
      // Broadcast via socket
      socketRef.current?.emit("note:change", { content, version: Date.now() });
      // Debounce save to API
      clearTimeout(saveTimer.current);
      dispatch(setIsSaving(true));
      saveTimer.current = setTimeout(async () => {
        try {
          await api.updateNote(shareId, { content, creatorFingerprint: fp });
          dispatch(setSavedAt(new Date().toISOString()));
        } catch {}
        dispatch(setIsSaving(false));
      }, 1500);
    },
  });

  // Load note
  useEffect(() => {
    dispatch(setStatus("loading"));
    api
      .getNote(shareId, { visitorFingerprint: fp })
      .then((data) => {
        dispatch(setNote(data));
        dispatch(setStatus("success"));
        if (editor && data.content) editor.commands.setContent(data.content);
      })
      .catch(async (e) => {
        if (e.requiresPassword) {
          dispatch(setStatus("password"));
        } else {
          dispatch(setStatus("error"));
        }
        // Private note — show password prompt
        if (
          e.message?.includes("password") ||
          e.message?.includes("protected")
        ) {
          dispatch(setStatus("password"));
        } else {
          dispatch(setStatus("error"));
        }
      });
  }, [shareId, editor]);

  // Socket
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      query: { shareId, fingerprint: fp },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("note:update", ({ content }) => {
      if (!editor) return;
      isRemoteUpdate.current = true;
      editor.commands.setContent(content);
      isRemoteUpdate.current = false;
    });

    socket.on("presence:update", ({ users }) => {
      dispatch(setActiveUsers(users));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [shareId, editor]);

  function formatSaved(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (status === "loading") return <LoadingScreen />;
  if (status === "error") return <ErrorScreen onHome={() => navigate("/")} />;
  if (status === "password")
    return (
      <PasswordScreen
        shareId={shareId}
        onUnlock={(data) => {
          dispatch(setNote(data));
          if (editor && data.content) editor.commands.setContent(data.content);
          dispatch(setStatus("success"));
        }}
      />
    );

  return (
    <div className={styles.page}>
      {/* Subtle bg accent */}
      <div className={styles.bgAccent} />

      {/* Top bar */}
      <header className={styles.topbar}>
        <button className={styles.logoLink} onClick={() => navigate("/")}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>NoteShare</span>
        </button>

        <div className={styles.topbarCenter}>
          {isSaving ? (
            <span className={styles.savingChip}>
              <span className={styles.savingDot} /> Saving…
            </span>
          ) : savedAt ? (
            <span className={styles.savedChip}>
              ✓ Saved {formatSaved(savedAt)}
            </span>
          ) : null}
        </div>

        <div className={styles.topbarRight}>
          <button
            className={styles.shareBtn}
            onClick={() => dispatch(toggleShareModal())}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            Share
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {editor && <Toolbar editor={editor} />}
      </div>

      {/* Editor */}
      <div className={styles.editorWrap}>
        <div className={styles.editorInner}>
          <EditorContent editor={editor} className={styles.editor} />
        </div>
      </div>

      {/* Bottom bar */}
      <footer className={styles.footer}>
        <span className={styles.footerStat}>
          {editor?.storage?.characterCount?.words() ?? 0} words ·{" "}
          {editor?.storage?.characterCount?.characters() ?? 0} chars
        </span>
        <span className={styles.footerStat}>
          {activeUsers.length > 0 ? `${activeUsers.length} active` : "Only you"}
        </span>
        <span className={styles.footerStat}>/{shareId}</span>
      </footer>

      {shareModalOpen && <ShareModal />}
    </div>
  );
}

function Toolbar({ editor }) {
  const tools = [
    {
      label: "B",
      title: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      active: () => editor.isActive("bold"),
      style: { fontWeight: 700 },
    },
    {
      label: "I",
      title: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      active: () => editor.isActive("italic"),
      style: { fontStyle: "italic" },
    },
    {
      label: "U",
      title: "Underline",
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: () => editor.isActive("underline"),
      style: { textDecoration: "underline" },
    },
    { sep: true },
    {
      label: "H1",
      title: "Heading 1",
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: () => editor.isActive("heading", { level: 1 }),
      style: { fontSize: "0.75rem", fontWeight: 700 },
    },
    {
      label: "H2",
      title: "Heading 2",
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: () => editor.isActive("heading", { level: 2 }),
      style: { fontSize: "0.75rem", fontWeight: 700 },
    },
    { sep: true },
    {
      label: "≡",
      title: "Bullet list",
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: () => editor.isActive("bulletList"),
      style: { fontSize: "1rem" },
    },
    {
      label: "1.",
      title: "Ordered list",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: () => editor.isActive("orderedList"),
      style: { fontSize: "0.78rem", fontWeight: 600 },
    },
    { sep: true },
    {
      label: "⌁",
      title: "Highlight",
      action: () => editor.chain().focus().toggleHighlight().run(),
      active: () => editor.isActive("highlight"),
      style: { fontSize: "1rem" },
    },
    {
      label: '"',
      title: "Blockquote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: () => editor.isActive("blockquote"),
      style: { fontSize: "1.1rem" },
    },
    { sep: true },
    {
      label: "↺",
      title: "Undo",
      action: () => editor.chain().focus().undo().run(),
      active: () => false,
      style: { fontSize: "1rem" },
    },
    {
      label: "↻",
      title: "Redo",
      action: () => editor.chain().focus().redo().run(),
      active: () => false,
      style: { fontSize: "1rem" },
    },
  ];

  return (
    <div className={styles.toolbarInner}>
      {tools.map((t, i) =>
        t.sep ? (
          <div key={i} className={styles.toolbarSep} />
        ) : (
          <button
            key={t.label}
            title={t.title}
            onClick={t.action}
            className={`${styles.toolBtn} ${t.active() ? styles.toolBtnActive : ""}`}
            style={t.style}
          >
            {t.label}
          </button>
        ),
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingSpinner} />
      <p>Loading note…</p>
    </div>
  );
}

function ErrorScreen({ onHome }) {
  return (
    <div className={styles.errorScreen}>
      <span style={{ fontSize: "3rem" }}>🌊</span>
      <h2>Note not found</h2>
      <p>This note may have expired or doesn't exist.</p>
      <button className={styles.homeBtn} onClick={onHome}>
        ← Back home
      </button>
    </div>
  );
}
function PasswordScreen({ shareId, onUnlock }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const fp = getFingerprint()

  async function handleSubmit() {
    if (!pw) return
    setLoading(true); setErr('')
    try {
      const data = await api.getNote(shareId, { password: pw, visitorFingerprint: fp })
      onUnlock(data)
    } catch (e) {
      setErr('Incorrect password')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.errorScreen}>
      <span style={{ fontSize: '2.5rem' }}>🔒</span>
      <h2>Private note</h2>
      <p>Enter the password to view this note.</p>
      <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ padding:'10px 14px', borderRadius:'10px', border:'1.5px solid var(--c-border)', fontSize:'0.9rem', outline:'none', fontFamily:'var(--font)' }}
        />
        <button className={styles.homeBtn} onClick={handleSubmit} disabled={loading}>
          {loading ? '…' : 'Unlock'}
        </button>
      </div>
      {err && <p style={{ color:'var(--c-danger)', fontSize:'0.8rem', marginTop:'6px' }}>{err}</p>}
    </div>
  )
}