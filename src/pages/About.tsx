import { useEffect } from 'react'
import PageTopBar from '../components/PageTopBar'
import FeedbackButton from '../components/FeedbackButton'
import { GremlinRosie, GremlinAce, GremlinVera } from '../components/GremlinsArt'

// ── Shared styles ─────────────────────────────────────────────────────────────

const section: React.CSSProperties = {
  marginBottom: 36,
}

const heading2: React.CSSProperties = {
  fontFamily: "'Quicksand', sans-serif",
  fontSize: 20,
  fontWeight: 700,
  color: '#1a7a72',
  marginBottom: 10,
  letterSpacing: '.3px',
}

const bodyText: React.CSSProperties = {
  fontFamily: "'Nunito', sans-serif",
  fontSize: 15,
  lineHeight: 1.7,
  color: 'var(--color-text-primary)',
  marginBottom: 12,
  margin: 0,
}

const divider: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--color-border-light)',
  margin: '28px 0',
}

const pillRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 4,
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: "'Quicksand', sans-serif",
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: '.4px',
      background: 'var(--color-bg-neutral)',
      color: '#1a7a72',
      border: '1px solid var(--color-border-light)',
      borderRadius: 20,
      padding: '5px 14px',
    }}>
      {children}
    </span>
  )
}

function PrincipleBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{
      background: 'var(--color-bg-primary)',
      border: '1px solid var(--color-border-light)',
      borderRadius: 10,
      padding: '14px 18px',
    }}>
      <div style={{
        fontFamily: "'Quicksand', sans-serif",
        fontSize: 13,
        fontWeight: 700,
        color: '#1a7a72',
        letterSpacing: '.4px',
        marginBottom: 6,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <p style={bodyText}>{text}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function About() {
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
      fontFamily: "'Nunito', sans-serif",
      padding: '50px 0 48px',
    }}>
      <PageTopBar />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>

        {/* ── Title block ── */}
        <h1 style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: 30,
          fontWeight: 700,
          color: '#4f4262',
          marginBottom: 4,
          letterSpacing: '.2px',
        }}>
          Women for Shared Progress
        </h1>
        <p style={{
          fontFamily: "'Nunito', sans-serif",
          fontSize: 14,
          color: 'var(--color-text-secondary)',
          marginBottom: 28,
          lineHeight: 1.5,
        }}>
          Making useful things. Deploying gremlins. Building power.
        </p>

        <hr style={divider} />

        {/* ── What is the 3AM Pipeline ── */}
        <div style={section}>
          <h2 style={heading2}>What is the 3AM Pipeline?</h2>
          <p style={{ ...bodyText, marginBottom: 12 }}>
            The 3AM Pipeline is a free civic tracking tool that gives you a clear, uncluttered view of
            legislation moving through federal and state governments — the bills that affect your rights,
            your safety, and your community.
          </p>
          <p style={bodyText}>
            Most of this legislation moves quietly. Hearings are scheduled at odd hours. Floor votes
            happen in windows most people aren't watching. We built this so that information asymmetry
            stops being a barrier to participation.
          </p>
        </div>

        <hr style={divider} />

        {/* ── Who We Are ── */}
        <div style={section}>
          <h2 style={heading2}>Who We Are</h2>
          <p style={{ ...bodyText, marginBottom: 12 }}>
            W4SP was founded by disabled Air Force veteran women who got tired of watching important
            legislation slip by unnoticed and decided to do something about it. We are builders, not
            commentators — we make tools and we put them in front of people who will use them.
          </p>
          <p style={{ ...bodyText, marginBottom: 20 }}>
            Our gremlins — Rosie, Ace, and Vera — are the spirit of the operation: scrappy, skilled,
            and working behind the scenes to keep things running.
          </p>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { G: GremlinRosie, name: 'Rosie' },
              { G: GremlinAce,   name: 'Ace'   },
              { G: GremlinVera,  name: 'Vera'  },
            ].map(({ G, name }) => (
              <div key={name} style={{ textAlign: 'center' }}>
                <G />
                <p style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  marginTop: 6,
                  letterSpacing: '.3px',
                }}>
                  {name}
                </p>
              </div>
            ))}
          </div>
        </div>

        <hr style={divider} />

        {/* ── Principles ── */}
        <div style={section}>
          <h2 style={heading2}>Our Principles</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <PrincipleBlock
              label="Nonpartisan"
              text="We track legislation across the political spectrum without editorial bias. Every bill on this tracker is chosen for its civic significance, not its political alignment."
            />
            <PrincipleBlock
              label="Open Source"
              text="The code is public. The data pipeline is documented. You don't have to take our word for anything — you can read the logic yourself."
            />
            <PrincipleBlock
              label="Free at Every Level"
              text="No paywalls. No premium tiers for the important features. Alerts, tracking, and district lookup are available to every account, always."
            />
            <PrincipleBlock
              label="Privacy First"
              text="No third-party analytics, no advertising networks, no tracking pixels. Your account data stays in our system and goes nowhere else. The only external call involving your information is the Census Geocoding API for district lookup."
            />
            <PrincipleBlock
              label="Human-Verified"
              text="Automated pulls from official sources only. Bill status and stage dates come from Congress.gov and official state sources. Context — what a bill means, who's behind it, urgency — is written by humans and never auto-overwritten."
            />
          </div>
        </div>

        <hr style={divider} />

        {/* ── What you can do ── */}
        <div style={section}>
          <h2 style={heading2}>What You Can Do Here</h2>
          <div style={pillRow}>
            <Pill>Track bills with Alert / Watch / Archive</Pill>
            <Pill>Get push notifications on bill movement</Pill>
            <Pill>Look up your district representatives</Pill>
            <Pill>Filter by policy area, urgency &amp; level</Pill>
            <Pill>Download the tracker for offline use</Pill>
            <Pill>Submit &amp; verify community district data</Pill>
          </div>
        </div>

        <hr style={divider} />

        {/* ── Data sources ── */}
        <div style={section}>
          <h2 style={heading2}>Where the Data Comes From</h2>
          <p style={{ ...bodyText, marginBottom: 12 }}>
            Federal bill status is pulled from the official Congress.gov API. Michigan legislation is
            sourced from the Michigan Legislature website with LegiScan as a fallback. Representative
            data is pulled from the Congress.gov member API. All pulls run automatically at 3&nbsp;AM US
            Eastern — hence the name.
          </p>
          <p style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}>
            We never pull from unofficial sources. We never make up data. When official sources show
            changes to a verified card, a human reviewer sees the diff before it goes live.
          </p>
        </div>

      </div>

      <FeedbackButton />
    </div>
  )
}
