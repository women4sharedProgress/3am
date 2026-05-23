import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { supabase } from '../lib/supabase'
import { FEDERAL_STAGES, MICHIGAN_STAGES, LOCAL_STAGES, ISSUE_LABELS } from '../lib/constants'
import type React from 'react'

interface BillUpdate {
  id: number
  name: string
  level: 'federal' | 'state' | 'local'
  state: string
  stage: number
  stage_note: string
  bill_desc: string
  urgency: string
  issues: string[]
  updated_at: string
}

const LEVEL_BG: Record<string, string> = {
  federal: '#0c1844',
  state:   '#003f8a',
  local:   '#1a4020',
}
const LEVEL_FG: Record<string, string> = {
  federal: '#b5d4f4',
  state:   '#d4eaff',
  local:   '#a0d8b0',
}
const STATE_NAMES: Record<string, string> = { MI: 'Michigan', KS: 'Kansas' }

const URGENCY_LABEL: Record<string, { text: string; color: string }> = {
  urgent:  { text: 'Time-sensitive',   color: '#C00000' },
  months:  { text: 'Moving soon',      color: '#E97132' },
  year:    { text: 'Longer timeline',  color: '#8880b4' },
  stalled: { text: 'Stalled',          color: '#555' },
}

function stageName(level: string, stage: number): string {
  const stages =
    level === 'federal' ? FEDERAL_STAGES :
    level === 'local'   ? LOCAL_STAGES :
    MICHIGAN_STAGES
  if (stage >= stages.length) return 'Enacted'
  return stages[stage] ?? 'Unknown'
}

function levelLabel(level: string, state: string): string {
  if (level === 'state') return STATE_NAMES[state] ?? state
  if (level === 'federal') return 'Federal'
  return 'Local'
}

const CUTOFF_DAYS = 30

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

function fmtDayHeading(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (dayKey(d.toISOString()) === dayKey(today.toISOString()))    return 'Today'
  if (dayKey(d.toISOString()) === dayKey(yesterday.toISOString())) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function reduceDash(text: string): string {
  return text.replace(/ — /g, ': ')
}

// Split "HB 1234 — Some Title" → { num: "HB 1234", title: "Some Title" }
function parseName(name: string): { num: string; title: string } {
  const dashIdx = name.indexOf('—')
  if (dashIdx > -1) {
    return { num: name.slice(0, dashIdx).trim(), title: reduceDash(name.slice(dashIdx + 1).trim()) }
  }
  const m = name.match(/^([A-Z.]+\s*\d+)\s+(.+)$/i)
  if (m) return { num: m[1], title: reduceDash(m[2]) }
  return { num: '', title: reduceDash(name) }
}

function csvEscape(v: string) { return `"${v.replace(/"/g, '""')}"` }

function downloadCsv(updates: BillUpdate[]) {
  const headers = ['Date Updated', 'Bill Number', 'Title', 'Level', 'Stage', 'Stage Note', 'Urgency', 'Description']
  const rows = updates.map(b => {
    const { num, title } = parseName(b.name)
    return [
      new Date(b.updated_at).toLocaleString('en-US'),
      num,
      title || b.name,
      levelLabel(b.level, b.state),
      stageName(b.level, b.stage),
      b.stage_note ?? '',
      b.urgency ?? '',
      b.bill_desc ?? '',
    ].map(csvEscape).join(',')
  })
  const csv = [headers.join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const DD = String(d.getDate()).padStart(2, '0')
  const Mon = d.toLocaleDateString('en-US', { month: 'short' })
  const YY = String(d.getFullYear()).slice(2)
  a.href = url; a.download = `Changelog_${DD}_${Mon}_${YY}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function downloadHtml(updates: BillUpdate[]) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const rows = updates.map(b => {
    const { num, title } = parseName(b.name)
    const bg = LEVEL_BG[b.level] ?? '#333'
    const fg = LEVEL_FG[b.level] ?? '#eee'
    const label = levelLabel(b.level, b.state)
    const stage = stageName(b.level, b.stage)
    const urgency = URGENCY_LABEL[b.urgency]
    return `<tr>
      <td>${new Date(b.updated_at).toLocaleString('en-US')}</td>
      <td><span style="background:${bg};color:${fg};padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700">${label}</span></td>
      <td>${num ? `<strong>${num}</strong> ` : ''}${title || b.name}</td>
      <td>${stage}${b.stage_note ? ` · <em>${b.stage_note}</em>` : ''}</td>
      <td style="color:${urgency?.color ?? '#999'}">${urgency?.text ?? ''}</td>
      <td style="font-size:12px;color:#888">${b.bill_desc ?? ''}</td>
    </tr>`
  }).join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Change Log · ${today}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;background:#1a1830;color:#e0ddf0;margin:0;padding:24px}
  h1{font-size:22px;margin:0 0 4px}
  p{font-size:13px;color:#888;margin:0 0 20px}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th{background:#2a2840;color:#b0a8d8;text-align:left;padding:8px 10px;font-weight:600;border-bottom:2px solid #3a3860}
  td{padding:8px 10px;border-bottom:1px solid #2a2840;vertical-align:top}
  tr:hover td{background:#22203a}
</style>
</head>
<body>
<h1>Change Log</h1>
<p>Exported ${today} · ${updates.length} update${updates.length !== 1 ? 's' : ''} in the last ${CUTOFF_DAYS} days</p>
<table>
  <thead><tr><th>Updated</th><th>Level</th><th>Bill</th><th>Stage</th><th>Urgency</th><th>Description</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const DD = String(d.getDate()).padStart(2, '0')
  const Mon = d.toLocaleDateString('en-US', { month: 'short' })
  const YY = String(d.getFullYear()).slice(2)
  a.href = url; a.download = `Changelog_${DD}_${Mon}_${YY}.html`; a.click()
  URL.revokeObjectURL(url)
}

const BTN: React.CSSProperties = {
  background: '#4F4262', color: '#fff',
  border: 'none', borderRadius: 20, padding: '5px 11px',
  display: 'flex', alignItems: 'center', gap: 5,
  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
  fontSize: 12, fontFamily: 'inherit',
}

export default function Changelog() {
  const navigate = useNavigate()
  const [updates, setUpdates]   = useState<BillUpdate[]>([])
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'content')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  useEffect(() => {
    const cutoff = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000).toISOString()
    supabase
      .from('bills')
      .select('id, name, level, state, stage, stage_note, bill_desc, urgency, issues, updated_at')
      .gte('updated_at', cutoff)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setUpdates(data as BillUpdate[])
        setLoading(false)
      })
  }, [])

  // Group into day buckets, ordered most-recent first
  const grouped: { key: string; label: string; bills: BillUpdate[] }[] = []
  const seen = new Map<string, number>()
  for (const b of updates) {
    const key = dayKey(b.updated_at)
    if (seen.has(key)) {
      grouped[seen.get(key)!].bills.push(b)
    } else {
      seen.set(key, grouped.length)
      grouped.push({ key, label: fmtDayHeading(b.updated_at), bills: [b] })
    }
  }

  const totalUpdates = updates.length

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg-secondary)',
      padding: '50px 28px 90px',
      color: 'var(--color-text-primary)',
      fontFamily: "'Nunito', sans-serif",
    }}>

      {/* ── Fixed top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: '#4F4262', color: '#fff',
              border: 'none', borderRadius: 20, padding: '5px 9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
            }}
            aria-label="Go to home"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <button onClick={() => downloadHtml(updates)} style={BTN} aria-label="Download HTML" disabled={loading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download HTML
          </button>
          <button onClick={() => downloadCsv(updates)} style={BTN} aria-label="Download CSV" disabled={loading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
            Download CSV
          </button>
          <button onClick={handleCopyLink} style={BTN} aria-label="Copy share link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <ThemeToggle />
      </div>

      <div style={{ maxWidth: 600 }}>
        <h1 style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 28, fontWeight: 700,
          margin: '0 0 4px', color: '#B597D5',
        }}>
          Change Log
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 6px', lineHeight: 1.6 }}>
          Live bill updates · entries fall off after {CUTOFF_DAYS} days
        </p>
        {!loading && (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: '0 0 28px' }}>
            {totalUpdates} update{totalUpdates !== 1 ? 's' : ''} in the last {CUTOFF_DAYS} days
          </p>
        )}

        {loading && (
          <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', marginTop: 40 }}>Loading…</p>
        )}

        {!loading && grouped.length === 0 && (
          <div style={{
            background: 'var(--color-card, #2a2840)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 12,
            padding: '28px 24px',
            textAlign: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: 14,
          }}>
            No bill updates in the last {CUTOFF_DAYS} days.
          </div>
        )}

        {grouped.map((group, gi) => (
          <div key={group.key} style={{ marginBottom: gi < grouped.length - 1 ? 32 : 0 }}>

            {/* ── Day header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: 13, fontWeight: 700,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                whiteSpace: 'nowrap',
              }}>{group.label}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border-light)' }} />
              <span style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
                whiteSpace: 'nowrap',
              }}>
                {group.bills.length} bill{group.bills.length !== 1 ? 's' : ''}
                {daysAgo(group.bills[0].updated_at) > 0 && (
                  <> · {daysAgo(group.bills[0].updated_at)}d ago</>
                )}
              </span>
            </div>

            {/* ── Bill cards for this day ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.bills.map(b => {
                const { num, title } = parseName(b.name)
                const bg = LEVEL_BG[b.level] ?? '#333'
                const fg = LEVEL_FG[b.level] ?? '#eee'
                const currentStage = stageName(b.level, b.stage)
                const urgency = URGENCY_LABEL[b.urgency]
                const issueList = (b.issues ?? []).slice(0, 3)
                return (
                  <div key={b.id} style={{
                    background: 'var(--color-card, #2a2840)',
                    border: '1px solid var(--color-border-light)',
                    borderLeft: `4px solid ${bg}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}>

                    {/* Meta row: level + bill number + time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{
                        background: bg, color: fg,
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '.07em',
                        padding: '2px 7px', borderRadius: 5,
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>{levelLabel(b.level, b.state)}</span>
                      {num && (
                        <span style={{
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: 12, fontWeight: 700,
                          color: 'var(--color-text-secondary)',
                        }}>{num}</span>
                      )}
                      <span style={{
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        marginLeft: 'auto',
                        whiteSpace: 'nowrap',
                      }}>{fmtDateTime(b.updated_at)}</span>
                    </div>

                    {/* Bill title */}
                    <div style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: 15, fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.4,
                    }}>{title || b.name}</div>

                    {/* What changed — full text, no truncation */}
                    <div style={{
                      background: 'var(--color-bg-secondary)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}>
                      <div style={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '.06em',
                        color: 'var(--color-text-tertiary)',
                      }}>What changed</div>
                      <div style={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: 15, fontWeight: 700,
                        color: fg,
                        background: bg,
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 6,
                        alignSelf: 'flex-start',
                      }}>→ {currentStage}</div>
                      {b.stage_note && (
                        <div style={{
                          fontFamily: "'Nunito', sans-serif",
                          fontSize: 14,
                          color: 'var(--color-text-primary)',
                          lineHeight: 1.55,
                        }}>{b.stage_note}</div>
                      )}
                    </div>

                    {/* Urgency + issue tags */}
                    {(urgency || issueList.length > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {urgency && (
                          <span style={{
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: 12, fontWeight: 700,
                            color: urgency.color,
                          }}>{urgency.text}</span>
                        )}
                        {issueList.map(issue => (
                          <span key={issue} style={{
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: 11, fontWeight: 600,
                            color: 'var(--color-text-secondary)',
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-light)',
                            borderRadius: 5,
                            padding: '2px 7px',
                            whiteSpace: 'nowrap',
                          }}>{ISSUE_LABELS[issue] ?? issue}</span>
                        ))}
                      </div>
                    )}

                  </div>
                )
              })}
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
