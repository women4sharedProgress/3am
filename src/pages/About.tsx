import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageTopBar from '../components/PageTopBar'
import FeedbackButton from '../components/FeedbackButton'

const wrap: React.CSSProperties = {
  maxWidth: 680,
  margin: '0 auto',
  padding: '0 24px',
}

const h1Style: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 28,
  fontWeight: 700,
  color: '#4f4262',
  marginBottom: 20,
  letterSpacing: '.2px',
}

const h2Style: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 19,
  fontWeight: 700,
  color: '#1a7a72',
  margin: '28px 0 12px',
  letterSpacing: '.2px',
}

const p: React.CSSProperties = {
  fontFamily: "'Nunito', sans-serif",
  fontSize: 15,
  lineHeight: 1.75,
  color: 'var(--color-text-primary)',
  marginBottom: 16,
}

const label: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontWeight: 700,
  color: '#1a7a72',
}

const divider: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--color-border-light)',
  margin: '24px 0',
}

const tierRow: React.CSSProperties = {
  fontFamily: "'Nunito', sans-serif",
  fontSize: 15,
  lineHeight: 1.7,
  color: 'var(--color-text-primary)',
  padding: '10px 14px',
  borderRadius: 8,
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border-light)',
  marginBottom: 8,
}

const tierLabel: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontWeight: 700,
  color: '#4f4262',
  marginRight: 6,
}

export default function About() {
  const navigate = useNavigate()

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-page', 'content')
    return () => {
      document.documentElement.removeAttribute('data-theme')
      document.documentElement.removeAttribute('data-page')
    }
  }, [])

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg-secondary)',
      color: 'var(--color-text-primary)',
      padding: '50px 0 64px',
    }}>
      <PageTopBar />

      <div style={wrap}>
        <h1 style={h1Style}>About</h1>

        <p style={p}>
          Women for Shared Progress (W4SP) is a for-profit organization founded by disabled Air Force
          veteran women. We like making useful things.
        </p>

        <p style={p}>
          The 3am Pipeline is a W4SP civic tech project that is explicitly nonpartisan, open source,
          free at all levels, and encourages individual participation in our effort to make civic
          involvement easier and more accessible to everyone.
        </p>

        <p style={p}>
          <span style={label}>The code:&nbsp;</span>
          The entire 3am Pipeline application is open source under GPL v3. Anyone can run their own
          copy as a personal tool. If this site ever goes down, the 3am Pipeline can resurface in the
          community. We built it to survive us.
        </p>

        <hr style={divider} />
        <h2 style={h2Style}>How it works</h2>

        <p style={p}>
          <span style={label}>W4SP LawTracker:&nbsp;</span>
          Each bill is pulled from official government sources and summarized in plain language on a
          card. Each card shows where a bill is in the process, who introduced it, who supports it,
          who's blocking it, and what is being decided.
        </p>

        <p style={p}>
          <span style={label}>Your data:&nbsp;</span>
          You can use the 3am Pipeline without an account or with our lowest level account with
          complete anonymity. Although you can supply an email for password retrieval and home address
          information, you don't have to. At higher account levels, you can choose to opt-in and share
          personal data for aggregate reporting. A zip code is enough for most features. If you choose
          to share more, it is entirely your choice, and you control each piece separately.
        </p>

        <p style={p}>
          Zip Codes are indexed to help autofill. Your District Information is used to help populate
          Your Representatives. The first person to enter local officials with District Information
          filled out is helping index districts to set up autofill for other users. Other users in the
          same district can verify the information is correct and current. Our gremlins also keep an
          eye on it for accuracy.
        </p>

        <p style={{ ...p, fontStyle: 'italic', color: '#1a7a72', marginBottom: 0 }}>
          The more you fill out, the more you help others.
        </p>

        <hr style={divider} />
        <h2 style={h2Style}>3am Pipeline Usage Tiers</h2>

        {[
          { tier: 'Tier 1', text: 'Read only, no account required. Access to LawTracker. Civic Calendar.' },
          { tier: 'Tier 2', text: 'Requires username and password. My Profile, Your Representatives, Alert/Watch/Archive, crowdsourced verification and editing.' },
          { tier: 'Tier 3', text: 'Identity verified by W4SP. Vetted verification agents — W4SP Administration, Elected Officials, Partners, volunteers, and broadcast agents.' },
          { tier: 'Tier 4', text: 'Requires personal information and at least one opt-in to data sharing. If opt-in aggregate data generates revenue, contributors share in it.' },
          { tier: 'Tier 5', text: 'Requires personal information and civic history. Tier 3 electoral alumni, users with sound participation history.' },
        ].map(({ tier, text }) => (
          <div key={tier} style={tierRow}>
            <span style={tierLabel}>{tier}:</span>
            {text}
          </div>
        ))}

        <p style={{ ...p, marginTop: 16 }}>
          All tiers access the same legislation. Tiers are differentiated by verification level and
          the features they unlock. This allows individuals to choose their level of privacy vs. tool
          access.
        </p>

        <hr style={divider} />

        <p style={p}>
          <span style={label}>Feedback button:&nbsp;</span>
          send comments, ideas, frustrations, bug reports, and kudos.
        </p>

        <button
          onClick={() => navigate('/open-source')}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 32,
            padding: '14px 24px',
            fontFamily: "'Quicksand', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '.4px',
            color: '#fff',
            background: '#1a7a72',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,.2)',
          }}
        >
          Clone &amp; Deploy the 3AM Pipeline
        </button>
      </div>

      <FeedbackButton />
    </div>
  )
}
