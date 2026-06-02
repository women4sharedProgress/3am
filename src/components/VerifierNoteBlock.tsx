import { useEffect, useRef, useState } from 'react'
import { verifierNoteSave, verifierNotesList } from '../lib/authApi'

interface NoteRow { username: string; note: string; updated_at: string }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function VerifierNoteBlock({
  billId,
  isAdmin,
}: {
  billId: number
  isAdmin: boolean
}) {
  const [open,      setOpen]      = useState(false)
  const [note,      setNote]      = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [notes,     setNotes]     = useState<NoteRow[]>([])
  const [noteCount, setNoteCount] = useState<number | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [status,    setStatus]    = useState<'idle' | 'saved' | 'error'>('idle')
  const [copied,    setCopied]    = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch on first open
  useEffect(() => {
    if (!open) return
    verifierNotesList(billId).then((res: {
      ok?: boolean;
      note?: string;
      notes?: NoteRow[];
      is_admin?: boolean;
    }) => {
      if (!res.ok) return
      if (res.is_admin && res.notes) {
        setNotes(res.notes)
        setNoteCount(res.notes.length)
      } else if (res.note !== undefined) {
        setNote(res.note)
        setSavedNote(res.note)
      }
    })
  }, [open, billId])

  // Admin: fetch note count immediately (badge on collapsed header)
  useEffect(() => {
    if (!isAdmin) return
    verifierNotesList(billId).then((res: { ok?: boolean; notes?: NoteRow[] }) => {
      if (res.ok && res.notes) setNoteCount(res.notes.length)
    })
  }, [billId, isAdmin])

  function scheduleSave(text: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      setStatus('idle')
      const res: { ok?: boolean } = await verifierNoteSave(billId, text)
      setSaving(false)
      setStatus(res.ok ? 'saved' : 'error')
      if (res.ok) setSavedNote(text)
      setTimeout(() => setStatus('idle'), 2000)
    }, 900)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setNote(val)
    scheduleSave(val)
  }

  async function copyAll() {
    const lines = notes.map(n =>
      `[${n.username} · ${fmtDate(n.updated_at)}]\n${n.note}`
    ).join('\n\n───\n\n')
    await navigator.clipboard.writeText(lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const isDirty = note !== savedNote

  return (
    <div style={{ marginTop: 10, borderTop: '1px dashed var(--color-border-light)', paddingTop: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'inherit', fontSize: 11,
          textTransform: 'uppercase', letterSpacing: '.05em',
          color: 'var(--color-text-tertiary)',
          fontWeight: 600,
        }}
        aria-expanded={open}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {isAdmin
          ? <>Verifier notes{noteCount !== null ? ` (${noteCount})` : ''}</>
          : 'My verifier note'
        }
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{ marginTop: 8 }}>
          {isAdmin ? (
            /* Admin: read-only list of all notes */
            notes.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>
                No verifier notes yet for this bill.
              </p>
            ) : (
              <>
                {notes.map((n, i) => (
                  <div key={i} style={{
                    marginBottom: 10, padding: '7px 10px',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 8, fontSize: 12,
                    border: '1px solid var(--color-border-light)',
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                      fontSize: 11, color: 'var(--color-text-tertiary)',
                      marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>
                      <span>{n.username}</span>
                      <span>{fmtDate(n.updated_at)}</span>
                    </div>
                    <div style={{
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    }}>
                      {n.note}
                    </div>
                  </div>
                ))}
                <button
                  onClick={copyAll}
                  style={{
                    marginTop: 4, fontSize: 11, padding: '4px 12px',
                    borderRadius: 20, border: '1px solid var(--color-border-medium)',
                    background: 'var(--color-bg-primary)', cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    fontFamily: "'Quicksand', sans-serif", fontWeight: 600,
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy all notes'}
                </button>
              </>
            )
          ) : (
            /* Tier 3 non-admin: own note editor */
            <>
              <textarea
                value={note}
                onChange={handleChange}
                maxLength={2000}
                placeholder="Private verifier note — only you and admins can see this…"
                style={{
                  width: '100%', minHeight: 80, resize: 'vertical',
                  fontFamily: "'Nunito', sans-serif", fontSize: 12,
                  lineHeight: 1.55, padding: '7px 10px',
                  borderRadius: 8, border: '1px solid var(--color-border-medium)',
                  background: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3,
              }}>
                <span>
                  {saving ? 'Saving…'
                    : status === 'saved' ? '✓ Saved'
                    : status === 'error' ? '✗ Save failed'
                    : isDirty ? 'Unsaved'
                    : note ? 'Saved'
                    : ''}
                </span>
                <span>{note.length}/2000</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
