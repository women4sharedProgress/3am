import type { Bill } from '../types/bill'
import { FEDERAL_STAGES, MICHIGAN_STAGES, LOCAL_STAGES, ISSUE_LABELS } from '../lib/constants'

// ── Constants (mirror Changelog.tsx) ──────────────────────────────────
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
function levelLabel(bill: Bill): string {
  if (bill.level === 'state') return STATE_NAMES[bill.state] ?? bill.state
  if (bill.level === 'federal') return 'Federal'
  return 'Local'
}
const URGENCY_LABEL: Record<string, { text: string; color: string }> = {
  urgent:  { text: 'Time-sensitive',  color: '#C00000' },
  months:  { text: 'Moving soon',     color: '#E97132' },
  year:    { text: 'Longer timeline', color: '#8880b4' },
  stalled: { text: 'Stalled',         color: '#555' },
}

const CUTOFF_MS = 30 * 24 * 60 * 60 * 1000

function stageName(level: string, stage: number): string {
  const stages =
    level === 'federal' ? FEDERAL_STAGES :
    level === 'local'   ? LOCAL_STAGES :
    MICHIGAN_STAGES
  if (stage >= stages.length) return 'Enacted'
  return stages[stage] ?? 'Unknown'
}

function reduceDash(t: string) { return t.replace(/ — /g, ': ') }

function parseName(name: string): { num: string; title: string } {
  const i = name.indexOf('—')
  if (i > -1) return { num: name.slice(0, i).trim(), title: reduceDash(name.slice(i + 1).trim()) }
  const m = name.match(/^([A-Z.]+\s*\d+)\s+(.+)$/i)
  if (m) return { num: m[1], title: reduceDash(m[2]) }
  return { num: '', title: reduceDash(name) }
}

function dayKey(iso: string) { return new Date(iso).toISOString().slice(0, 10) }

function fmtDayHeading(iso: string): string {
  const d = new Date(iso)
  const today     = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (dayKey(d.toISOString()) === dayKey(today.toISOString()))     return 'Today'
  if (dayKey(d.toISOString()) === dayKey(yesterday.toISOString())) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

function daysAgo(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

// ── Component ──────────────────────────────────────────────────────────
interface Props {
  bills:  Bill[]
  label?: string   // section heading, e.g. "Alert Activity" or "Watch Activity"
}

export default function BillActivity({ bills, label = 'Recent Activity' }: Props) {
  const cutoff = Date.now() - CUTOFF_MS

  // Filter to bills updated within 30 days, sort newest first
  const recent = bills
    .filter(b => new Date(b.updated_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  if (recent.length === 0) return null

  // Group by calendar day
  const groups: { key: string; label: string; bills: Bill[] }[] = []
  const seen = new Map<string, number>()
  for (const b of recent) {
    const key = dayKey(b.updated_at)
    if (seen.has(key)) {
      groups[seen.get(key)!].bills.push(b)
    } else {
      seen.set(key, groups.length)
      groups.push({ key, label: fmtDayHeading(b.updated_at), bills: [b] })
    }
  }

  return (
    <div style={{ margin: '0 8px 4px' }}>

      {/* Section heading */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, margin: '16px 4px 12px',
      }}>
        <span style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 12, fontWeight: 700,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase', letterSpacing: '.1em',
          whiteSpace: 'nowrap',
        }}>{label}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border-light)' }} />
        <span style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 11, color: 'var(--color-text-tertiary)',
          whiteSpace: 'nowrap',
        }}>{recent.length} update{recent.length !== 1 ? 's' : ''} · last 30 days</span>
      </div>

      {/* Day groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
        {groups.map((group, gi) => (
          <div key={group.key}>

            {/* Day header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: 11, fontWeight: 700,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '.07em',
                whiteSpace: 'nowrap',
              }}>{group.label}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border-light)', opacity: .5 }} />
              <span style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 10, color: 'var(--color-text-tertiary)',
                whiteSpace: 'nowrap',
              }}>
                {group.bills.length} bill{group.bills.length !== 1 ? 's' : ''}
                {gi === 0 && daysAgo(group.bills[0].updated_at) > 0 && (
                  <> · {daysAgo(group.bills[0].updated_at)}d ago</>
                )}
              </span>
            </div>

            {/* Change cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {group.bills.map(b => {
                const { num, title } = parseName(b.name)
                const bg      = LEVEL_BG[b.level] ?? '#333'
                const fg      = LEVEL_FG[b.level] ?? '#eee'
                const stage   = stageName(b.level, b.stage)
                const urgency = URGENCY_LABEL[b.urgency]
                const issues  = (b.issues ?? []).slice(0, 3)
                return (
                  <div key={b.id} style={{
                    background: 'var(--color-card, #2a2840)',
                    border: '1px solid var(--color-border-light)',
                    borderLeft: `4px solid ${bg}`,
                    borderRadius: 9,
                    padding: '10px 13px',
                    display: 'flex', flexDirection: 'column', gap: 5,
                  }}>
                    {/* Row 1: level badge · bill num · datetime */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        background: bg, color: fg,
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: 9, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '.07em',
                        padding: '2px 6px', borderRadius: 4,
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>{levelLabel(b)}</span>
                      {num && (
                        <span style={{
                          fontFamily: "'Quicksand', sans-serif",
                          fontSize: 10, fontWeight: 700,
                          color: 'var(--color-text-tertiary)',
                        }}>{num}</span>
                      )}
                      <span style={{
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 10, color: 'var(--color-text-tertiary)',
                        marginLeft: 'auto', whiteSpace: 'nowrap',
                      }}>{fmtTime(b.updated_at)}</span>
                    </div>

                    {/* Row 2: stage pill · note */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        background: bg, color: fg,
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: 9, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '.06em',
                        padding: '2px 7px', borderRadius: 4,
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}>→ {stage}</span>
                      {b.stage_note && (
                        <span style={{
                          fontFamily: "'Nunito', sans-serif",
                          fontSize: 11, color: 'var(--color-text-tertiary)',
                          fontStyle: 'italic',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{b.stage_note}</span>
                      )}
                    </div>

                    {/* Row 3: title */}
                    <div style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: 13, fontWeight: 700,
                      color: 'var(--color-text-primary)', lineHeight: 1.35,
                    }}>{title || b.name}</div>

                    {/* Row 4: urgency + issues */}
                    {(urgency || issues.length > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {urgency && (
                          <span style={{
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: 10, fontWeight: 600, color: urgency.color,
                          }}>{urgency.text}</span>
                        )}
                        {issues.map(iss => (
                          <span key={iss} style={{
                            fontFamily: "'Nunito', sans-serif",
                            fontSize: 9, fontWeight: 600,
                            color: 'var(--color-text-tertiary)',
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-light)',
                            borderRadius: 4, padding: '1px 5px',
                            whiteSpace: 'nowrap',
                          }}>{ISSUE_LABELS[iss] ?? iss}</span>
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

      {/* Divider before bill cards */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, margin: '4px 4px 0',
      }}>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border-light)' }} />
        <span style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 11, fontWeight: 700,
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '.08em',
        }}>All bills</span>
        <div style={{ flex: 1, height: 1, background: 'var(--color-border-light)' }} />
      </div>
    </div>
  )
}
