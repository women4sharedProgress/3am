import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import ThemeToggle from '../components/ThemeToggle'

// ── Party colours ─────────────────────────────────────────────────────────
const DEM = '#003F87'
const REP = '#CC0000'
const IND = '#5C14B8'
type Party = 'D' | 'R' | 'I'
function pc(p: Party) { return p === 'D' ? DEM : p === 'R' ? REP : IND }

// ── State tracker data ────────────────────────────────────────────────────
interface StateEntry {
  code: string
  name: string
  path: string
  governor:  { surname: string; party: Party }
  senator1:  { surname: string; party: Party }
  senator2:  { surname: string; party: Party }
  voterInfo: { label: string; url: string; bg: string; text: string }
  polling:   { label: string; url: string; bg: string; text: string }
}

const STATES: StateEntry[] = [
  {
    code: 'MI',
    name: 'Michigan',
    path: '/tracker/michigan',
    governor: { surname: 'Whitmer',  party: 'D' },
    senator1: { surname: 'Peters',   party: 'D' },
    senator2: { surname: 'Slotkin',  party: 'D' },
    voterInfo: {
      label: 'MI Voter Info',
      url:   'https://www.michigan.gov/sos/elections',
      bg:    '#7BBDE1',
      text:  '#1a3a4a',
    },
    polling: {
      label: 'MI District & Polling',
      url:   'https://mvic.sos.state.mi.us/Voter/Index',
      bg:    '#5AAFD4',
      text:  '#0a1e2e',
    },
  },
  {
    code: 'KS',
    name: 'Kansas',
    path: '/tracker/kansas',
    governor: { surname: 'Kelly',    party: 'D' },
    senator1: { surname: 'Marshall', party: 'R' },
    senator2: { surname: 'Moran',    party: 'R' },
    voterInfo: {
      label: 'KS Voter Info',
      url:   'https://sos.ks.gov/elections/elections_main.html',
      bg:    '#FFE066',
      text:  '#1a1200',
    },
    polling: {
      label: 'KS District & Polling',
      url:   'https://myvoteinfo.voteks.org/',
      bg:    '#1A3E72',
      text:  '#FFE066',
    },
  },
]

// ── Sub-components ────────────────────────────────────────────────────────

function FederalCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Federal LawTracker"
      style={{
        position: 'relative', overflow: 'hidden',
        width: 133, height: 133, borderRadius: 16,
        border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'transform .15s, box-shadow .15s',
        WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 36px rgba(0,0,0,.32)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '' }}
    >
      {/* Blue left diagonal */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, background: '#003F87',
        clipPath: 'polygon(0% 0%, 80% 0%, 20% 100%, 0% 100%)',
      }} />
      {/* Red right diagonal */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, background: '#CC0000',
        clipPath: 'polygon(80% 0%, 100% 0%, 100% 100%, 20% 100%)',
      }} />
      <span style={{
        fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
        fontSize: 16, color: 'white', position: 'relative', zIndex: 1,
        textShadow: '0 1px 8px rgba(0,0,0,.5)',
      }}>
        🇺🇸 Federal
      </span>
      <span style={{
        fontFamily: "'Nunito', sans-serif", fontWeight: 400,
        fontSize: 13, color: 'rgba(255,255,255,.85)', position: 'relative', zIndex: 1,
        textShadow: '0 1px 6px rgba(0,0,0,.5)', textAlign: 'center', padding: '0 14px',
      }}>
        LawTracker
      </span>
    </button>
  )
}

function VoterPill({ label, url, bg, text }: { label: string; url: string; bg: string; text: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: bg, borderRadius: 20, padding: '7px 14px',
        textDecoration: 'none', flexShrink: 0,
        transition: 'filter .12s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1.08)'}
      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.filter = ''}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke={text} strokeWidth="2" fill="none"/>
        <path d="M9 12l2 2 4-4" stroke={text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 13, fontWeight: 700, color: text }}>
        {label}
      </span>
    </a>
  )
}

function DistrictPill({ label, url, bg, text }: { label: string; url: string; bg: string; text: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: bg, borderRadius: 20, padding: '7px 14px',
        textDecoration: 'none', flexShrink: 0,
        transition: 'filter .12s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1.08)'}
      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.filter = ''}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={text} strokeWidth="2" fill="none"/>
        <circle cx="12" cy="9" r="2.5" stroke={text} strokeWidth="2" fill="none"/>
      </svg>
      <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: 13, fontWeight: 700, color: text }}>
        {label}
      </span>
    </a>
  )
}

function StateCard({ s, onClick }: { s: StateEntry; onClick: () => void }) {
  const govColor  = pc(s.governor.party)
  const sen1Color = pc(s.senator1.party)
  const sen2Color = pc(s.senator2.party)
  const gradient  = `linear-gradient(to bottom, ${govColor} 0%, ${govColor} 33.33%, ${sen1Color} 33.33%, ${sen1Color} 66.66%, ${sen2Color} 66.66%, ${sen2Color} 100%)`

  const partyLabel = (p: Party) => p === 'D' ? 'Dem' : p === 'R' ? 'Rep' : 'Ind'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Thirds card */}
      <button
        onClick={onClick}
        aria-label={`${s.name} LawTracker`}
        style={{
          width: 82, height: 88, borderRadius: 12,
          border: 'none', cursor: 'pointer', padding: 0,
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3,
          flexShrink: 0,
          transition: 'transform .12s, box-shadow .12s',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 5px 16px rgba(0,0,0,.25)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '' }}
      >
        {/* Thirds gradient background */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: gradient }} />
        {/* Subtle dark overlay for text readability */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.18)' }} />
        {/* State name */}
        <span style={{
          position: 'relative', zIndex: 2,
          fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
          fontSize: 13, color: 'white', textAlign: 'center',
          textShadow: '0 1px 6px rgba(0,0,0,.8)',
          lineHeight: 1.2, padding: '0 4px',
        }}>
          {s.name}
        </span>
        <span style={{
          position: 'relative', zIndex: 2,
          fontFamily: "'Nunito', sans-serif", fontWeight: 400,
          fontSize: 10, color: 'rgba(255,255,255,.9)',
          textShadow: '0 1px 4px rgba(0,0,0,.8)',
        }}>
          Tracker
        </span>
        {/* Party legend: Gov · S1 · S2 */}
        <span style={{
          position: 'relative', zIndex: 2,
          fontFamily: "'Quicksand', sans-serif", fontWeight: 600,
          fontSize: 9, color: 'rgba(255,255,255,.85)',
          textShadow: '0 1px 3px rgba(0,0,0,.9)',
          letterSpacing: '.03em',
        }}>
          G:{partyLabel(s.governor.party)} · S:{partyLabel(s.senator1.party)} · S:{partyLabel(s.senator2.party)}
        </span>
      </button>

      {/* Voter info + polling pills stacked vertically */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <VoterPill
          label={s.voterInfo.label}
          url={s.voterInfo.url}
          bg={s.voterInfo.bg}
          text={s.voterInfo.text}
        />
        <DistrictPill
          label={s.polling.label}
          url={s.polling.url}
          bg={s.polling.bg}
          text={s.polling.text}
        />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function LawTrackers() {
  const navigate = useNavigate()

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    return () => document.documentElement.removeAttribute('data-theme')
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)', paddingBottom: 40 }}>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            aria-label="Back to home"
            style={{
              background: '#4F4262', color: '#fff',
              border: 'none', borderRadius: 20, padding: '5px 9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <h1 style={{
            fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
            fontSize: 18, margin: 0,
            color: 'var(--color-text-primary)',
          }}>
            LawTrackers
          </h1>
        </div>
        <ThemeToggle />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 36,
        padding: '36px 20px 0',
      }}>

        {/* Federal tracker — large featured button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <FederalCard onClick={() => navigate('/tracker')} />
          <span style={{
            fontFamily: "'Nunito', sans-serif", fontSize: 12,
            color: 'var(--color-text-tertiary)', letterSpacing: '.04em',
          }}>
            119th Congress · Federal bills only
          </span>
        </div>

        {/* Divider */}
        <div style={{
          width: '100%', maxWidth: 480,
          borderTop: '1px solid var(--color-border-light)',
        }} />

        {/* State trackers */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          gap: 28, alignItems: 'flex-start',
          width: '100%', maxWidth: 480,
        }}>
          <h2 style={{
            fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
            fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em',
            color: 'var(--color-text-tertiary)', margin: 0, alignSelf: 'flex-start',
          }}>
            State Trackers
          </h2>

          {STATES.map(s => (
            <StateCard
              key={s.code}
              s={s}
              onClick={() => navigate(s.path)}
            />
          ))}
        </div>

        {/* Party colour legend */}
        <div style={{
          display: 'flex', gap: 20, marginTop: 8,
          fontFamily: "'Nunito', sans-serif", fontSize: 11,
          color: 'var(--color-text-tertiary)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: DEM, display: 'inline-block' }} />
            Democrat
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: REP, display: 'inline-block' }} />
            Republican
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: IND, display: 'inline-block' }} />
            Independent
          </span>
        </div>
        <p style={{
          fontFamily: "'Nunito', sans-serif", fontSize: 10,
          color: 'var(--color-text-tertiary)', margin: 0, textAlign: 'center',
          maxWidth: 340,
        }}>
          Card thirds: top = Governor · middle = Senior Senator · bottom = Junior Senator
        </p>
      </div>
    </div>
  )
}
