import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { api } from '../utils/api'
import { getFingerprint } from '../utils/fingerprint'
import { setNote } from '../store'
import styles from './HomePage.module.css'

export default function HomePage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [creating, setCreating] = useState(false)
  const [globalStats, setGlobalStats] = useState(null)

  useEffect(() => {
    api.getGlobalStats().then(setGlobalStats).catch(() => {})
  }, [])

  async function handleCreate() {
    setCreating(true)
    try {
      const fp = getFingerprint()
      const note = await api.createNote({ creatorFingerprint: fp })
      dispatch(setNote(note))
      navigate('/note/' + note.shareId)
    } catch (e) {
      console.error(e)
      setCreating(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>NoteShare</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.badge}>No signup needed</div>
          <h1 className={styles.title}>
            Share notes,<br />
            <span className={styles.titleAccent}>instantly.</span>
          </h1>
          <p className={styles.subtitle}>
            Create a note, get a link. Share publicly or lock with a password.
            Real-time collaboration, no account required.
          </p>
          <button className={styles.ctaBtn} onClick={handleCreate} disabled={creating}>
            {creating
              ? <span className={styles.spinner} />
              : <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg> New note</>
            }
          </button>
        </div>

        {globalStats && (
          <div className={styles.stats}>
            {[
              { num: globalStats.totalNotes, label: 'Notes created' },
              { num: globalStats.totalVisits, label: 'Total visits ever' },
              { num: globalStats.totalUniqueVisitors, label: 'Unique visitors' },
            ].map(s => (
              <div key={s.label} className={styles.statCard}>
                <span className={styles.statNum}>{s.num?.toLocaleString() ?? '—'}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.features}>
          {[
            { icon: '🔗', title: 'Public link', desc: 'Anyone with the URL can read' },
            { icon: '🔒', title: 'Password lock', desc: 'Protect with a private password' },
            { icon: '⚡', title: 'Live collab', desc: 'Multiple people edit together' },
            { icon: '✏️', title: 'Custom URL', desc: 'Edit the slug to something memorable' },
          ].map(f => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <strong className={styles.featureTitle}>{f.title}</strong>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
