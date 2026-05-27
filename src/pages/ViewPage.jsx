import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/layout/Navbar'
import { NoteEditor } from '../components/editor/NoteEditor'
import { Button } from '../components/ui/Button'
import { Badge, ActiveDot } from '../components/ui/Badge'
import { api } from '../utils/api'
import { getFingerprint, isCreator } from '../utils/fingerprint'
import { useNoteSocket } from '../hooks/useNoteSocket'
import { Clock, Eye, Edit3, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

function PasswordGate({ onSubmit }) {
  const [pw, setPw]     = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{
        maxWidth: 380, margin: '6rem auto',
        padding: '0 1.25rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center',
        animation: 'fadeUp 0.4s ease',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-md)',
          background: 'var(--accent-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <Lock size={22} color="var(--accent)" />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.8rem', fontWeight: 300,
          marginBottom: '0.5rem',
        }}>
          Private note
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Enter the password to view this note.
        </p>
        <input
          type="password"
          placeholder="Password…"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit(pw)}
          autoFocus
          style={{
            width: '100%',
            padding: '0.7rem 1rem',
            marginBottom: '0.75rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem',
            outline: 'none',
            textAlign: 'center',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <Button onClick={() => onSubmit(pw)} style={{ width: '100%', justifyContent: 'center' }}>
          Unlock
        </Button>
      </div>
    </div>
  )
}

export function ViewPage() {
  const { shareId } = useParams()
  const navigate    = useNavigate()

  const [note, setNote]         = useState(null)
  const [content, setContent]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [activeCount, setActiveCount]     = useState(0)

  const loadNote = async (password) => {
    try {
      const fp   = getFingerprint()
      const data = await api.getNote(shareId, password, fp)
      setNote(data)
      setContent(data.content)
      setNeedsPassword(false)
      setLoading(false)
    } catch (err) {
      if (err.message.includes('password') || err.message.includes('Password')) {
        setNeedsPassword(true)
        setLoading(false)
      } else if (err.message.includes('Incorrect')) {
        toast.error('Incorrect password')
      } else {
        toast.error('Note not found')
        navigate('/')
      }
    }
  }

  useEffect(() => { loadNote() }, [shareId])

  const { } = useNoteSocket({
    shareId,
    enabled: !!note,
    onRemoteUpdate: (c) => setContent(c),
  })

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <Navbar />
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 300 }}>
        Loading…
      </div>
    </div>
  )

  if (needsPassword) return <PasswordGate onSubmit={loadNote} />

  const canEdit = isCreator(shareId)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>
      <Navbar right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {activeCount > 1 && <ActiveDot count={activeCount} />}
          {canEdit && (
            <Button variant="secondary" size="sm" onClick={() => navigate(`/note/${shareId}/edit`)}>
              <Edit3 size={13} /> Edit
            </Button>
          )}
        </div>
      } />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 1.25rem 5rem', animation: 'fadeUp 0.4s ease' }}>
        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {note.isPrivate
            ? <Badge color="accent">Private</Badge>
            : <Badge color="green">Public</Badge>
          }
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <Eye size={11} /> {note.stats?.totalVisits ?? 0} visits
          </span>
          {note.expiresAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <Clock size={11} /> Expires {new Date(note.expiresAt).toLocaleDateString()}
            </span>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {new Date(note.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <NoteEditor content={content} readOnly />

        {/* Create your own CTA */}
        {!canEdit && (
          <div style={{
            marginTop: '3rem',
            padding: '1.25rem 1.5rem',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.2rem', fontSize: '0.9rem' }}>Create your own note</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No signup. Free. Instant.</div>
            </div>
            <Button onClick={() => navigate('/')}>Get started →</Button>
          </div>
        )}
      </main>
    </div>
  )
}
