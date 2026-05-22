import { useEffect, useState } from 'react'
import PageTopBar from '../components/PageTopBar'
import { supabase } from '../lib/supabase'

interface PatchNote {
  id: string
  pull_date: string
  summary: string
  details: {
    federal_bills?: { updated: number; pending: number; skipped: number; error?: string }
    michigan_bills?: { updated: number; error?: string }
    representatives?: { upserted: number; error?: string }
  } | null
  created_at: string
}

const SEEN_KEY = 'wsp-patches-last-seen'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PatchesUpdates() {
  const [notes, setNotes] = useState<PatchNote[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase
      .from('patch_notes')
      .select('id, pull_date, summary, details, created_at')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setNotes((data as PatchNote[]) ?? [])
        setLoading(false)
      })
    // Mark as seen
    localStorage.setItem(SEEN_KEY, new Date().toISOString())
    // Notify Home to clear the green indicator on next render
    window.dispatchEvent(new CustomEvent('patches-seen'))
  }, [])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <PageTopBar />

      <div style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: '72px 16px 40px',
      }}>
        {/* Reminder banner */}
        <div style={{
          background: '#4F4262',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>&#128161;</span>
          <span style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 14,
            color: '#ffffff',
            lineHeight: 1.6,
          }}>
            <strong>For best results:</strong> clear your browser cache and refresh the page before viewing.
            On most browsers: <strong>Ctrl + Shift + Delete</strong> (Windows) or <strong>Cmd + Shift + Delete</strong> (Mac).
          </span>
        </div>

        <h1 style={{
          fontFamily: "'Quicksand', sans-serif",
          fontWeight: 700,
          fontSize: 22,
          color: '#B597D5',
          marginBottom: 6,
          letterSpacing: '.2px',
        }}>Patches &amp; Updates</h1>

        <p style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          marginBottom: 28,
          lineHeight: 1.65,
        }}>
          A summary of each nightly data pull — bill status updates, representative syncs, and any issues encountered.
        </p>

        {loading && (
          <p style={{ fontFamily: "'Nunito', sans-serif", color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            Loading…
          </p>
        )}

        {!loading && notes.length === 0 && (
          <div style={{
            background: 'var(--color-card, #fff)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 10,
            padding: '20px 20px',
            fontFamily: "'Nunito', sans-serif",
            fontSize: 14,
            color: 'var(--color-text-tertiary)',
          }}>
            No pull logs yet. The first entry will appear after the next nightly refresh.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map(n => {
            const isOpen = expanded.has(n.id)
            const d = n.details
            return (
              <div key={n.id} style={{
                background: 'var(--color-card, #fff)',
                border: '1px solid var(--color-border-light)',
                borderLeft: '4px solid #4F4262',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{
                      fontFamily: "'Quicksand', sans-serif",
                      fontWeight: 700,
                      fontSize: 11,
                      color: '#B597D5',
                      textTransform: 'uppercase',
                      letterSpacing: '.5px',
                      marginBottom: 4,
                    }}>
                      {formatDate(n.created_at)}
                    </div>
                    <div style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: 14,
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.5,
                    }}>
                      {n.summary}
                    </div>
                  </div>
                  {d && (
                    <button
                      onClick={() => toggleExpand(n.id)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: 6,
                        padding: '3px 8px',
                        cursor: 'pointer',
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--color-text-tertiary)',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? 'Less' : 'Details'}
                    </button>
                  )}
                </div>

                {isOpen && d && (
                  <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--color-border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    {d.federal_bills && (
                      <DetailRow
                        label="Federal bills"
                        ok={!d.federal_bills.error}
                        text={
                          d.federal_bills.error
                            ? `Skipped — ${d.federal_bills.error}`
                            : `${d.federal_bills.updated} updated · ${d.federal_bills.pending} pending review · ${d.federal_bills.skipped} skipped`
                        }
                      />
                    )}
                    {d.michigan_bills && (
                      <DetailRow
                        label="Michigan bills"
                        ok={!d.michigan_bills.error}
                        text={
                          d.michigan_bills.error
                            ? `Skipped — ${d.michigan_bills.error}`
                            : `${d.michigan_bills.updated} updated`
                        }
                      />
                    )}
                    {d.representatives && (
                      <DetailRow
                        label="Representatives"
                        ok={!d.representatives.error}
                        text={
                          d.representatives.error
                            ? `Skipped — ${d.representatives.error}`
                            : `${d.representatives.upserted} synced`
                        }
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{
        width: 8, height: 8, borderRadius: 2,
        background: ok ? '#00B050' : '#C00000',
        flexShrink: 0, marginTop: 4,
      }} />
      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--color-text-primary)' }}>{label}:</strong> {text}
      </div>
    </div>
  )
}
