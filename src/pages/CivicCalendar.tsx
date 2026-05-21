import { useEffect, useMemo } from 'react'
import PageTopBar from '../components/PageTopBar'

type EventType = 'election' | 'registration' | 'session' | 'deadline'
type Scope = 'national' | 'michigan'

interface CivicEvent {
  id: string
  date: string       // YYYY-MM-DD; used for sort + days-until
  endDate?: string   // YYYY-MM-DD; for ranges (sessions, etc.)
  title: string
  type: EventType
  scope: Scope
  note?: string
}

const TYPE_COLOR: Record<EventType, string> = {
  election:     '#C00000',
  registration: '#1D4ED8',
  session:      '#008080',
  deadline:     '#b8860b',
}

const TYPE_LABEL: Record<EventType, string> = {
  election:     'Election',
  registration: 'Registration',
  session:      'Session',
  deadline:     'Deadline',
}

const SCOPE_LABEL: Record<Scope, string> = {
  national: 'Federal / National',
  michigan: 'Michigan',
}

const EVENTS: CivicEvent[] = [
  // ── 2025 ──────────────────────────────────────────────────────────────────
  {
    id: '2025-mi-reg-nov',
    date: '2025-10-20',
    title: 'Michigan Voter Registration Deadline — November Election',
    type: 'registration', scope: 'michigan',
    note: 'Deadline for mail and online registration. Same-day registration is also available at your polling place on Election Day.',
  },
  {
    id: '2025-election-nov',
    date: '2025-11-04',
    title: 'Election Day — Off-Year State & Local',
    type: 'election', scope: 'national',
    note: 'New Jersey and Virginia hold gubernatorial elections. Many states hold municipal, school board, and special elections. Michigan: city and township races.',
  },

  // ── 2026 ──────────────────────────────────────────────────────────────────
  {
    id: '2026-congress',
    date: '2026-01-03',
    title: '120th U.S. Congress Convenes',
    type: 'session', scope: 'national',
    note: 'New session begins. The 119th Congress adjourns following the 2026 election cycle.',
  },
  {
    id: '2026-mi-session',
    date: '2026-01-14',
    title: 'Michigan Legislature — Spring Session Resumes',
    type: 'session', scope: 'michigan',
    note: 'The Michigan Legislature typically reconvenes in mid-January following the holiday recess. Check michigan.gov/legislature for confirmed dates.',
  },
  {
    id: '2026-primary-open',
    date: '2026-03-03',
    title: 'Primary Season Opens — 2026 Midterms',
    type: 'election', scope: 'national',
    note: "First major state primary elections for the 2026 midterm cycle. Dates vary significantly by state — check your state's Secretary of State for exact dates.",
  },
  {
    id: '2026-mi-reg-primary',
    date: '2026-07-20',
    title: 'Michigan Voter Registration Deadline — August Primary',
    type: 'registration', scope: 'michigan',
    note: '15 days before the August 4 primary. Same-day registration also available at polls.',
  },
  {
    id: '2026-mi-primary',
    date: '2026-08-04',
    title: 'Michigan Primary Election',
    type: 'election', scope: 'michigan',
    note: 'Michigan holds primary elections for all 13 congressional seats, all 110 State House seats, and 19 State Senate seats up for election.',
  },
  {
    id: '2026-midterm-reg',
    date: '2026-10-19',
    title: 'Voter Registration Deadline — Most States',
    type: 'registration', scope: 'national',
    note: 'Most states require registration 15–30 days before Election Day. Some states (including Michigan) allow same-day registration. Verify with your state.',
  },
  {
    id: '2026-mi-reg-nov',
    date: '2026-10-19',
    title: 'Michigan Voter Registration Deadline — November Election',
    type: 'registration', scope: 'michigan',
    note: '15 days before the November 3 election. Same-day registration also available at your polling place.',
  },
  {
    id: '2026-midterms',
    date: '2026-11-03',
    title: 'Election Day — 2026 Midterm Elections',
    type: 'election', scope: 'national',
    note: 'All 435 U.S. House seats · 33 U.S. Senate seats (Classes II and III) · 36 gubernatorial races. Michigan: all 13 U.S. House seats, all 110 State House seats, 19 State Senate seats.',
  },
]

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function DaysBadge({ days }: { days: number }) {
  if (days < 0) return null
  if (days === 0) return (
    <span style={{
      background: '#C00000', color: '#fff',
      fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
    }}>Today</span>
  )
  if (days <= 7) return (
    <span style={{
      background: '#C00000', color: '#fff',
      fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
    }}>{days}d</span>
  )
  if (days <= 30) return (
    <span style={{
      background: '#b8860b', color: '#fff',
      fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
    }}>{days}d</span>
  )
  return (
    <span style={{
      background: 'var(--color-bg-primary)', color: 'var(--color-text-tertiary)',
      border: '1px solid var(--color-border-light)',
      fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
    }}>{days}d</span>
  )
}

export default function CivicCalendar() {
  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'content')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  const { upcoming, past } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sorted = [...EVENTS].sort((a, b) => a.date.localeCompare(b.date))
    const upcoming: CivicEvent[] = []
    const past: CivicEvent[] = []
    for (const e of sorted) {
      const [y, m, d] = e.date.split('-').map(Number)
      const eventDate = new Date(y, m - 1, d)
      if (eventDate >= today) upcoming.push(e)
      else past.push(e)
    }
    return { upcoming, past: past.reverse() }
  }, [])

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg-secondary)',
      color: 'var(--color-text-primary)',
      padding: '50px 0 64px',
    }}>
      <PageTopBar />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>

        <h1 style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 28, fontWeight: 700,
          color: '#4f4262', marginBottom: 8, letterSpacing: '.2px',
        }}>Civic Calendar</h1>

        <p style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 15, lineHeight: 1.75,
          color: 'var(--color-text-primary)', marginBottom: 32,
        }}>
          Key upcoming elections, registration deadlines, and legislative sessions.
          Dates shown are for federal elections and Michigan state elections.
          Always verify registration deadlines with your state's Secretary of State.
        </p>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {(Object.entries(TYPE_LABEL) as [EventType, string][]).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 3,
                background: TYPE_COLOR[k], flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                fontSize: 12, color: 'var(--color-text-secondary)',
              }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <div style={{
              fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
              fontSize: 13, textTransform: 'uppercase', letterSpacing: '.6px',
              color: 'var(--color-text-tertiary)', marginBottom: 12,
            }}>Upcoming</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
              {upcoming.map(e => {
                const days = daysUntil(e.date)
                return (
                  <div key={e.id} style={{
                    background: 'var(--color-card, #fff)',
                    border: `1px solid var(--color-border-light)`,
                    borderLeft: `4px solid ${TYPE_COLOR[e.type]}`,
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                          fontSize: 11, color: TYPE_COLOR[e.type],
                          textTransform: 'uppercase', letterSpacing: '.4px',
                        }}>{TYPE_LABEL[e.type]}</span>
                        <span style={{
                          fontFamily: "'Nunito', sans-serif",
                          fontSize: 11, color: 'var(--color-text-tertiary)',
                          background: 'var(--color-bg-secondary)',
                          padding: '1px 7px', borderRadius: 20,
                        }}>{SCOPE_LABEL[e.scope]}</span>
                      </div>
                      <DaysBadge days={days} />
                    </div>

                    <div style={{
                      fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                      fontSize: 15, color: 'var(--color-text-primary)',
                      lineHeight: 1.35, marginBottom: 4,
                    }}>{e.title}</div>

                    <div style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: 12, color: 'var(--color-text-tertiary)',
                      marginBottom: e.note ? 6 : 0,
                    }}>{formatDate(e.date)}</div>

                    {e.note && (
                      <div style={{
                        fontFamily: "'Nunito', sans-serif",
                        fontSize: 13, lineHeight: 1.55,
                        color: 'var(--color-text-secondary)',
                      }}>{e.note}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Past */}
        {past.length > 0 && (
          <>
            <div style={{
              fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
              fontSize: 13, textTransform: 'uppercase', letterSpacing: '.6px',
              color: 'var(--color-text-tertiary)', marginBottom: 12,
            }}>Past</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {past.map(e => (
                <div key={e.id} style={{
                  background: 'var(--color-card, #fff)',
                  border: '1px solid var(--color-border-light)',
                  borderLeft: `4px solid var(--color-border-medium)`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  opacity: 0.55,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{
                      fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                      fontSize: 11, color: 'var(--color-text-tertiary)',
                      textTransform: 'uppercase', letterSpacing: '.4px',
                    }}>{TYPE_LABEL[e.type]}</span>
                    <span style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: 11, color: 'var(--color-text-tertiary)',
                    }}>· {SCOPE_LABEL[e.scope]}</span>
                  </div>
                  <div style={{
                    fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                    fontSize: 14, color: 'var(--color-text-secondary)',
                    lineHeight: 1.3, marginBottom: 2,
                  }}>{e.title}</div>
                  <div style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: 12, color: 'var(--color-text-tertiary)',
                  }}>{formatDate(e.date)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{
          marginTop: 40,
          fontFamily: "'Nunito', sans-serif",
          fontSize: 12, color: 'var(--color-text-tertiary)',
          lineHeight: 1.6,
          borderTop: '1px solid var(--color-border-light)',
          paddingTop: 20,
        }}>
          Dates are sourced from official election calendars and legislative schedules.
          Registration deadlines reflect standard mail/online deadlines; same-day registration
          is available in Michigan and several other states. Verify all dates with your state's
          official election authority before acting.
        </div>

      </div>
    </div>
  )
}
