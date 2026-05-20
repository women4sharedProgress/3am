import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Candidate {
  name:         string
  party:        string
  announced:    string   // ISO date
  backers:      string[]
  opposers:     string[]
  issues:       Array<{ issue: string; position: string }>
}

const CANDIDATES: Candidate[] = [
  {
    name:      'Candidate A',
    party:     'Democrat',
    announced: '2025-03-15',
    backers:   ['Progressive Alliance', 'Labor Unions', 'Environmental PACs'],
    opposers:  ['Chamber of Commerce', 'Energy Sector groups'],
    issues: [
      { issue: 'Healthcare',    position: 'Expand Medicare to cover all Americans' },
      { issue: 'Climate',       position: 'Rejoin Paris Agreement; 100% clean energy by 2035' },
      { issue: 'Economy',       position: 'Raise minimum wage to $20/hr federally' },
      { issue: 'Immigration',   position: 'Pathway to citizenship for DACA recipients' },
    ],
  },
  {
    name:      'Candidate B',
    party:     'Republican',
    announced: '2025-04-02',
    backers:   ['Business Roundtable', 'Faith-based coalitions', 'Small government PACs'],
    opposers:  ['Teachers unions', 'Environmental groups'],
    issues: [
      { issue: 'Economy',       position: 'Reduce corporate tax rate; eliminate regulatory burden' },
      { issue: 'Border',        position: 'Complete border barrier; end catch-and-release' },
      { issue: 'Education',     position: 'Expand school choice and voucher programs' },
      { issue: 'Healthcare',    position: 'Repeal ACA mandates; expand Health Savings Accounts' },
    ],
  },
]

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PresidentialCandidates() {
  const navigate = useNavigate()
  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    return () => { document.documentElement.removeAttribute('data-theme') }
  }, [])
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg-secondary)',
      padding: '32px 28px',
      color: 'var(--color-text-primary)',
      fontFamily: "'Nunito', sans-serif",
    }}>
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 100,
          background: '#4F4262', color: '#fff',
          border: 'none', borderRadius: 20, padding: '5px 9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,.25)',
        }}
        aria-label="Go to home"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </button>

      <h1 style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 4, color: 'var(--page-title)' }}>
        Presidential Candidates
      </h1>
      <p style={{ fontSize: 14, color: 'var(--page-subtitle)', marginBottom: 28 }}>
        Official candidates listed in order of announcement date
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {CANDIDATES.sort((a, b) => new Date(a.announced).getTime() - new Date(b.announced).getTime()).map(c => (
          <div key={c.name} style={{
            background: 'var(--color-bg-primary)',
            border: '.5px solid var(--color-border-light)',
            borderRadius: 12,
            padding: '20px 22px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 20, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{c.party}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10 }}>Announced</div>
                <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmtDate(c.announced)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Backers</div>
                <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {c.backers.map(b => <li key={b}>{b}</li>)}
                </ul>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-tertiary)', marginBottom: 4 }}>Opposers</div>
                <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {c.opposers.map(o => <li key={o}>{o}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Issues &amp; Positions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {c.issues.map(item => (
                  <div key={item.issue} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--color-text-primary)', minWidth: 90 }}>{item.issue}</span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{item.position}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
