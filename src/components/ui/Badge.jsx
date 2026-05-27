export function Badge({ children, color = 'default', style }) {
  const colors = {
    default: { bg: 'var(--bg-surface)', text: 'var(--text-secondary)', border: 'var(--border)' },
    accent:  { bg: 'var(--accent-dim)', text: 'var(--accent)',          border: 'var(--accent-glow)' },
    green:   { bg: 'rgba(39,174,96,0.1)', text: 'var(--green)',        border: 'rgba(39,174,96,0.2)' },
    red:     { bg: 'rgba(192,57,43,0.1)', text: 'var(--red)',          border: 'rgba(192,57,43,0.2)' },
  }
  const c = colors[color] || colors.default
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.04em',
      textTransform: 'uppercase',
      padding: '0.2rem 0.55rem',
      borderRadius: 99,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      ...style
    }}>
      {children}
    </span>
  )
}

export function ActiveDot({ count }) {
  if (!count) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      fontSize: '0.75rem', color: 'var(--green)',
      fontFamily: 'var(--font-mono)',
    }}>
      <span style={{
        position: 'relative',
        width: 7, height: 7,
        borderRadius: '50%',
        background: 'var(--green)',
        display: 'inline-block',
      }}>
        <span style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: 'var(--green)',
          animation: 'pulse-ring 1.5s ease-out infinite',
        }} />
      </span>
      {count}
    </span>
  )
}
