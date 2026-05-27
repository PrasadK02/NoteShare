import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Copy, Check, Lock, Globe, ExternalLink } from 'lucide-react'

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        display: 'flex', gap: '0.5rem', alignItems: 'center',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '0.5rem 0.75rem',
      }}>
        <span style={{
          flex: 1, fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</span>
        <button
          onClick={copy}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: copied ? 'var(--green)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center',
            transition: 'var(--transition)',
            padding: 2,
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}

export function ShareModal({ open, onClose, shareId, isPrivate, password }) {
  const base = window.location.origin
  const publicUrl  = `${base}/note/${shareId}`

  return (
    <Modal open={open} onClose={onClose} title="Share this note" width={440}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isPrivate
            ? <><Lock size={14} color="var(--accent)" /><Badge color="accent">Private — password protected</Badge></>
            : <><Globe size={14} color="var(--green)" /><Badge color="green">Public — anyone with the link</Badge></>
          }
        </div>

        <CopyField label="Share link" value={publicUrl} />

        {isPrivate && password && (
          <CopyField label="Password" value={password} />
        )}

        {/* Open in new tab */}
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.8rem', color: 'var(--accent)',
            textDecoration: 'none',
          }}
        >
          <ExternalLink size={13} /> Open in new tab
        </a>

        <Button variant="secondary" onClick={onClose} style={{ marginTop: '0.25rem' }}>
          Done
        </Button>
      </div>
    </Modal>
  )
}
