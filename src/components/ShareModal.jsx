import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { closeShareModal, updateSlugLocal, setNote } from '../store'
import { api } from '../utils/api'
import { getFingerprint } from '../utils/fingerprint'
import styles from './ShareModal.module.css'

export default function ShareModal() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const note = useSelector(s => s.notes.current)
  const [copied, setCopied] = useState(false)
  const [slug, setSlug] = useState(note?.shareId || '')
  const [slugError, setSlugError] = useState('')
  const [slugSaving, setSlugSaving] = useState(false)
  const [slugSaved, setSlugSaved] = useState(false)

  // Private note state
  const [isPrivate, setIsPrivate] = useState(note?.isPrivate || false)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [privacyError, setPrivacyError] = useState('')

  const origin = window.location.origin
  const basePath = `${origin}/note/`

  useEffect(() => { setSlug(note?.shareId || '') }, [note?.shareId])
  useEffect(() => { setIsPrivate(note?.isPrivate || false) }, [note?.isPrivate])

  function handleCopy() {
    navigator.clipboard.writeText(`${basePath}${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function validateSlug(val) {
    if (!val) return 'Slug cannot be empty'
    if (val.length < 3) return 'Min 3 characters'
    if (val.length > 32) return 'Max 32 characters'
    if (!/^[a-zA-Z0-9-_]+$/.test(val)) return 'Only letters, numbers, - and _'
    return ''
  }

  async function handleSlugSave() {
    const err = validateSlug(slug)
    if (err) { setSlugError(err); return }
    if (slug === note?.shareId) return
    setSlugSaving(true); setSlugError('')
    try {
      await api.updateSlug(note.shareId, { newSlug: slug, creatorFingerprint: getFingerprint() })
      dispatch(updateSlugLocal(slug))
      setSlugSaved(true)
      setTimeout(() => setSlugSaved(false), 2000)
      navigate(`/note/${slug}`, { replace: true })
    } catch (e) {
      setSlugError(e.message || 'Slug already taken')
    } finally { setSlugSaving(false) }
  }

  function handleSlugKey(e) {
    if (e.key === 'Enter') handleSlugSave()
    if (e.key === 'Escape') { setSlug(note?.shareId || ''); setSlugError('') }
  }

  async function handlePrivacySave() {
    if (isPrivate && !password && !note?.isPrivate) {
      setPrivacyError('Enter a password to lock this note')
      return
    }
    setPrivacySaving(true); setPrivacyError('')
    try {
      const updated = await api.updateNote(note.shareId, {
        isPrivate,
        password: isPrivate ? password : null,
        creatorFingerprint: getFingerprint(),
        _privacyUpdate: true,
      })
      dispatch(setNote({ ...note, isPrivate }))
      setPrivacySaved(true)
      setPassword('')
      setTimeout(() => setPrivacySaved(false), 2500)
    } catch (e) {
      setPrivacyError(e.message || 'Failed to update privacy')
    } finally { setPrivacySaving(false) }
  }

  return (
    <div className={styles.overlay} onClick={() => dispatch(closeShareModal())}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <h2 className={styles.title}>Share note</h2>
          <button className={styles.closeBtn} onClick={() => dispatch(closeShareModal())}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* URL + editable slug */}
        <div className={styles.section}>
          <label className={styles.label}>Share link</label>
          <div className={styles.urlRow}>
            <div className={styles.urlBar}>
              <span className={styles.urlBase}>{basePath}</span>
              <input
                className={styles.slugInput}
                value={slug}
                onChange={e => { setSlug(e.target.value); setSlugError(''); setSlugSaved(false) }}
                onKeyDown={handleSlugKey}
                onBlur={handleSlugSave}
                spellCheck={false}
                style={{ width: `${Math.max(slug.length, 4)}ch` }}
              />
            </div>
            <button className={styles.copyBtn} onClick={handleCopy}>
              {copied
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> Copy</>
              }
            </button>
          </div>
          {slugError && <p className={styles.slugError}>{slugError}</p>}
          {slugSaved && <p className={styles.slugOk}>✓ URL updated</p>}
          <p className={styles.hint}>Edit the <strong>highlighted part</strong> to customize. Press Enter or click away to save.</p>
        </div>

        {/* Privacy toggle */}
        <div className={styles.section}>
          <label className={styles.label}>Privacy</label>
          <div className={styles.privacyCard}>
            <div className={styles.privacyToggleRow}>
              <div className={styles.privacyInfo}>
                <span className={styles.privacyIcon}>{isPrivate ? '🔒' : '🌐'}</span>
                <div>
                  <p className={styles.privacyTitle}>{isPrivate ? 'Private — password required' : 'Public — anyone with link'}</p>
                  <p className={styles.privacyDesc}>{isPrivate ? 'Only people with the password can read this note' : 'Anyone with the link can view this note'}</p>
                </div>
              </div>
              <button
                className={`${styles.toggle} ${isPrivate ? styles.toggleOn : ''}`}
                onClick={() => { setIsPrivate(v => !v); setPrivacyError(''); setPrivacySaved(false) }}
                aria-label="Toggle private"
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>

            {isPrivate && (
              <div className={styles.passwordRow}>
                <div className={styles.passwordField}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className={styles.passwordInput}
                    placeholder={note?.isPrivate ? 'Enter new password to change…' : 'Set a password…'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setPrivacyError('') }}
                    onKeyDown={e => e.key === 'Enter' && handlePrivacySave()}
                  />
                  <button className={styles.eyeBtn} onClick={() => setShowPass(v => !v)} type="button">
                    {showPass
                      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
                      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
                <button
                  className={styles.savePrivacyBtn}
                  onClick={handlePrivacySave}
                  disabled={privacySaving}
                >
                  {privacySaving ? <span className={styles.miniSpinner} /> : 'Save'}
                </button>
              </div>
            )}

            {!isPrivate && note?.isPrivate !== isPrivate && (
              <div style={{ marginTop: '10px' }}>
                <button className={styles.savePrivacyBtn} onClick={handlePrivacySave} disabled={privacySaving}>
                  {privacySaving ? <span className={styles.miniSpinner} /> : 'Make public'}
                </button>
              </div>
            )}

            {privacyError && <p className={styles.slugError}>{privacyError}</p>}
            {privacySaved && <p className={styles.slugOk}>✓ Privacy updated</p>}
          </div>
        </div>

        {/* Stats */}
        {note?.stats && (
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{note.stats.totalVisits ?? 0}</span>
              <span className={styles.statLabel}>visits</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{note.stats.uniqueVisitors ?? 0}</span>
              <span className={styles.statLabel}>unique</span>
            </div>
          </div>
        )}

        {/* Actions — no Twitter */}
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => window.open(`${basePath}${slug}`, '_blank')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open in new tab
          </button>
          <button className={styles.actionBtn} onClick={() => {
            if (navigator.share) {
              navigator.share({ title: note?.title || 'NoteShare', url: `${basePath}${slug}` })
            } else {
              handleCopy()
            }
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
        </div>

      </div>
    </div>
  )
}
