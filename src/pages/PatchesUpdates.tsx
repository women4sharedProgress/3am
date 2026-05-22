import { useEffect, useState } from 'react'
import PageTopBar from '../components/PageTopBar'
import { supabase } from '../lib/supabase'

interface PatchNote {
  id: string
  pull_date: string
  summary: string
  details: {
    federal_bills?: { updated: number; pending: number; skipped: number; error?: string }
    michigan_bills?: { updated: number; pending: number; hearings: number; skipped: number; error?: string }
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
    localStorage.setItem(SEEN_KEY, new Date().toISOString())
    window.dispatchEvent(new CustomEvent('patches-seen'))
  }, [])

return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <PageTopBar />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '72px 16px 40px' }}>

        <div style={{
          padding: '0 4px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>&#128161;</span>
          <span style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}>
            <strong>For best results:</strong> clear your browser cache and refresh before viewing.
            <span style={{ color: 'var(--color-text-tertiary)' }}> Ctrl + Shift + Delete (Windows) · Cmd + Shift + Delete (Mac)</span>
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
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 10,
            padding: '20px',
            fontFamily: "'Nunito', sans-serif",
            fontSize: 14,
            color: 'var(--color-text-secondary)',
          }}>
            No pull logs yet. The first entry will appear after the next nightly refresh.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notes.map(n => {
            const d = n.details
            return (
              <div key={n.id} style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                borderLeft: '4px solid #B597D5',
                borderRadius: 10,
                padding: '14px 16px',
              }}>
                <div>
                  <div style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    color: 'var(--color-text-tertiary)',
                    letterSpacing: '.3px',
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
                            : [
                                `${d.michigan_bills.updated} updated`,
                                d.michigan_bills.pending  ? `${d.michigan_bills.pending} pending review`  : '',
                                d.michigan_bills.hearings ? `${d.michigan_bills.hearings} escalated to Act Now` : '',
                                d.michigan_bills.skipped  ? `${d.michigan_bills.skipped} skipped` : '',
                              ].filter(Boolean).join(' · ')
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
        background: ok ? 'var(--color-text-success)' : 'var(--color-text-danger)',
        flexShrink: 0, marginTop: 4,
      }} />
      <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
        <strong>{label}:</strong> {text}
      </div>
    </div>
  )
}
