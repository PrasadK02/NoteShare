import { useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Navbar } from '../components/layout/Navbar'
import { NoteEditor } from '../components/editor/NoteEditor'
import { Button } from '../components/ui/Button'
import { Badge, ActiveDot } from '../components/ui/Badge'
import { ShareModal } from '../components/ui/ShareModal'
import { api } from '../utils/api'
import { getFingerprint, isCreator } from '../utils/fingerprint'
import { setSaving, setLastSaved } from '../store'
import { useNoteSocket } from '../hooks/useNoteSocket'
import { Share2, Save, Trash2, Clock, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

function SaveIndicator({ isSaving, lastSaved }) {
  if (isSaving) return (
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulse-ring 1s ease infinite' }} />
      Saving…
    </span>
  )
  if (lastSaved) return (
    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      Saved {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
  return null
}

export function EditPage() {
  const { shareId }    = useParams()
  const navigate       = useNavigate()
  const dispatch       = useDispatch()
  const { isSaving, lastSaved, activeCount } = useSelector(s => s.note)

  const [note, setNote]         = useState(null)
  const [content, setContent]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [password, setPassword] = useState('')

  const saveTimer = useRef(null)

  // Load note
  useEffect(() => {
    const fp = getFingerprint()
    api.getNote(shareId, undefined, fp)
      .then(data => {
        setNote(data)
        setContent(data.content)
        setLoading(false)
      })
      .catch(err => {
        if (err.message.includes('password')) navigate(`/note/${shareId}`)
        else { toast.error('Note not found'); navigate('/') }
      })
  }, [shareId])

  // Auto-save debounce
  const handleChange = useCallback((newContent) => {
    setContent(newContent)
    emitChange(newContent)
    dispatch(setSaving(true))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await api.updateNote(shareId, {
          content: newContent,
          creatorFingerprint: getFingerprint(),
        })
        dispatch(setLastSaved(Date.now()))
      } catch (e) {
        toast.error('Save failed')
      } finally {
        dispatch(setSaving(false))
      }
    }, 1500)
  }, [shareId])

  const { emitChange } = useNoteSocket({
    shareId,
    enabled: !!note,
    onRemoteUpdate: (remoteContent) => setContent(remoteContent),
  })

  const handleDelete = async () => {
    if (!confirm('Delete this note permanently?')) return
    try {
      await api.deleteNote(shareId, getFingerprint())
      toast.success('Note deleted')
      navigate('/')
    } catch (e) { toast.error(e.message) }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300 }}>
        Loading note…
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <Navbar right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
          {activeCount > 1 && <ActiveDot count={activeCount} />}
          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 size={13} /> Share
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} style={{ color: 'var(--red)' }}>
            <Trash2 size={13} />
          </Button>
        </div>
      } />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        {/* Meta bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {note.isPrivate
            ? <Badge color="accent">Private</Badge>
            : <Badge color="green">Public</Badge>
          }
          {note.expiresAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <Clock size={11} /> Expires {new Date(note.expiresAt).toLocaleDateString()}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <Eye size={11} /> {note.stats?.totalVisits ?? 0} visits
          </span>
        </div>

        <NoteEditor
          content={content}
          onChange={handleChange}
          placeholder="Start writing your note…"
        />

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(`/note/${shareId}`)}>
            View as reader →
          </Button>
        </div>
      </main>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareId={shareId}
        isPrivate={note?.isPrivate}
        password={note?.isPrivate ? password : undefined}
      />
    </div>
  )
}
