export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style, ...props }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: '0.4rem',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'var(--transition)',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.5 : 1,
  }

  const sizes = {
    sm: { fontSize: '0.8rem',  padding: '0.3rem 0.75rem', height: 30 },
    md: { fontSize: '0.875rem', padding: '0.5rem 1.1rem',  height: 36 },
    lg: { fontSize: '0.95rem', padding: '0.65rem 1.5rem', height: 42 },
  }

  const variants = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--text-inverse)',
      borderColor: 'var(--accent)',
    },
    secondary: {
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      borderColor: 'transparent',
    },
    danger: {
      background: 'transparent',
      color: 'var(--red)',
      borderColor: 'var(--red)',
    },
  }

  const handleHover = (e, entering) => {
    if (disabled) return
    if (variant === 'primary') {
      e.currentTarget.style.filter = entering ? 'brightness(1.08)' : 'none'
      e.currentTarget.style.boxShadow = entering ? 'var(--shadow-glow)' : 'none'
    } else if (variant === 'secondary') {
      e.currentTarget.style.borderColor = entering ? 'var(--accent)' : 'var(--border)'
    } else if (variant === 'ghost') {
      e.currentTarget.style.color = entering ? 'var(--text-primary)' : 'var(--text-secondary)'
      e.currentTarget.style.background = entering ? 'var(--bg-surface)' : 'transparent'
    }
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={e => handleHover(e, true)}
      onMouseLeave={e => handleHover(e, false)}
      {...props}
    >
      {children}
    </button>
  )
}
