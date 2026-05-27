import { useDispatch, useSelector } from 'react-redux'
import { toggleTheme } from '../../store'
import { Sun, Moon, Feather } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Navbar({ right }) {
  const dispatch  = useDispatch()
  const theme     = useSelector(s => s.theme.mode)
  const navigate  = useNavigate()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg-overlay)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '0 1.25rem',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <Feather size={18} color="var(--accent)" strokeWidth={1.5} />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            fontWeight: 400,
            letterSpacing: '0.02em',
            color: 'var(--text-primary)',
          }}>
            nota
          </span>
        </button>

        {/* Right slot + theme toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {right}
          <button
            onClick={() => dispatch(toggleTheme())}
            title="Toggle theme"
            style={{
              width: 34, height: 34,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'var(--transition)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </div>
    </header>
  )
}
