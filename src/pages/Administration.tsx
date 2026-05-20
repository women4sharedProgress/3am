import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Member {
  title: string
  name: string
  date: string
  acting?: boolean
  badge?: string   // e.g. "Independent", "Military"
  note?: string    // secondary status note shown below date
  desc: string
  fact: string
}

const MEMBERS: Member[] = [
  {
    title: 'Vice President',
    name: 'JD Vance',
    date: 'Jan 20, 2025',
    desc: 'Second-highest elected official in the executive branch. Presides over the Senate and casts tie-breaking votes.',
    fact: 'Youngest serving VP at 40 years old at inauguration; first millennial elected to the executive branch.',
  },
  {
    title: 'Chief of Staff',
    name: 'Susie Wiles',
    date: 'Jan 20, 2025',
    desc: 'Manages the White House staff, controls the President\'s schedule, and directs policy flow through the West Wing.',
    fact: 'First woman in U.S. history to serve as White House Chief of Staff.',
  },
  {
    title: 'Secretary of State',
    name: 'Marco Rubio',
    date: 'Jan 21, 2025',
    desc: 'Leads U.S. foreign policy, diplomacy, and manages 275+ embassies and consulates worldwide.',
    fact: 'Confirmed 99–0 — the only unanimous Senate confirmation in the 47th Administration.',
  },
  {
    title: 'Secretary of Treasury',
    name: 'Scott Bessent',
    date: 'Jan 27, 2025',
    desc: 'Manages federal finances, the national debt, tax policy, and the strength of the U.S. dollar.',
    fact: 'First openly gay cabinet member confirmed by a Republican president.',
  },
  {
    title: 'Secretary of Defense',
    name: 'Pete Hegseth',
    date: 'Feb 4, 2025',
    desc: 'Oversees the U.S. military, the Pentagon, and America\'s global force posture across all branches.',
    fact: 'Confirmed 50–50 with Vice President Vance casting the tie-breaking vote.',
  },
  {
    title: 'Attorney General',
    name: 'Todd Blanche',
    date: 'Apr 2, 2026',
    acting: true,
    desc: 'Heads the Department of Justice and serves as the nation\'s chief law enforcement officer.',
    fact: 'Blanche was previously Trump\'s personal criminal defense attorney before joining the DOJ.',
  },
  {
    title: 'Secretary of Interior',
    name: 'Doug Burgum',
    date: 'Jan 30, 2025',
    desc: 'Manages 500 million acres of federal land, national parks, wildlife refuges, and natural resources.',
    fact: 'Former North Dakota Governor who sold a software company to Microsoft for over $1 billion.',
  },
  {
    title: 'Secretary of Agriculture',
    name: 'Brooke Rollins',
    date: 'Feb 13, 2025',
    desc: 'Oversees U.S. farm policy, food safety, rural development, and the SNAP nutrition program.',
    fact: 'SNAP (food stamps), USDA\'s largest program, serves roughly 42 million Americans annually.',
  },
  {
    title: 'Secretary of Commerce',
    name: 'Howard Lutnick',
    date: 'Feb 18, 2025',
    desc: 'Promotes economic growth and oversees trade policy, patents, weather services, and the Census Bureau.',
    fact: 'Stepped down as CEO of Cantor Fitzgerald — one of Wall Street\'s largest bond-trading firms — to serve.',
  },
  {
    title: 'Secretary of Labor',
    name: 'Keith Sonderling',
    date: 'Apr 20, 2026',
    acting: true,
    desc: 'Enforces wage and hour laws, worker safety standards, and administers unemployment and pension programs.',
    fact: 'Previously served as Vice Chair of the Equal Employment Opportunity Commission (EEOC).',
  },
  {
    title: 'Secretary of HHS',
    name: 'Robert F. Kennedy Jr.',
    date: 'Feb 13, 2025',
    desc: 'Oversees public health agencies including the FDA, CDC, NIH, and administers Medicare and Medicaid.',
    fact: 'First member of the Kennedy family to serve in a Republican cabinet.',
  },
  {
    title: 'Secretary of HUD',
    name: 'Scott Turner',
    date: 'Feb 5, 2025',
    desc: 'Administers federal housing programs, community development grants, and fair housing enforcement.',
    fact: 'Former NFL wide receiver who played for five teams across nine professional seasons.',
  },
  {
    title: 'Secretary of Transportation',
    name: 'Sean Duffy',
    date: 'Jan 28, 2025',
    desc: 'Oversees aviation safety, highways, rail, maritime transport, and the nation\'s infrastructure programs.',
    fact: 'The DOT oversees $1.2 trillion in infrastructure investment under the Bipartisan Infrastructure Law.',
  },
  {
    title: 'Secretary of Energy',
    name: 'Chris Wright',
    date: 'Feb 3, 2025',
    desc: 'Directs U.S. energy policy and maintains stewardship of America\'s nuclear weapons stockpile.',
    fact: 'The DOE operates 17 national laboratories including Los Alamos, Oak Ridge, and Sandia.',
  },
  {
    title: 'Secretary of Education',
    name: 'Linda McMahon',
    date: 'Mar 3, 2025',
    desc: 'Administers federal education grants and oversees $76 billion in annual student financial aid.',
    fact: 'Former CEO of WWE professional wrestling; also served as SBA Administrator in Trump\'s first term.',
  },
  {
    title: 'Secretary of Veterans Affairs',
    name: 'Doug Collins',
    date: 'Feb 4, 2025',
    desc: 'Provides healthcare, disability benefits, and services to 9 million enrolled U.S. veterans.',
    fact: 'The VA is the second-largest federal department by budget, behind only the Department of Defense.',
  },
  {
    title: 'Secretary of Homeland Security',
    name: 'Markwayne Mullin',
    date: 'Mar 24, 2026',
    desc: 'Oversees border security, immigration enforcement, FEMA disaster response, and the Coast Guard.',
    fact: 'DHS was created after September 11, 2001 by consolidating 22 separate government agencies.',
  },
  {
    title: 'Dir. of National Intelligence',
    name: 'Tulsi Gabbard',
    date: 'Feb 12, 2025',
    desc: 'Coordinates and oversees all 18 U.S. intelligence agencies and advises the President on threats.',
    fact: 'First woman confirmed as Director of National Intelligence.',
  },
  {
    title: 'CIA Director',
    name: 'John Ratcliffe',
    date: 'Jan 23, 2025',
    desc: 'Leads the CIA\'s foreign intelligence collection, analysis, and covert operations worldwide.',
    fact: 'Ratcliffe previously served as Director of National Intelligence in Trump\'s first term.',
  },
  {
    title: 'UN Ambassador',
    name: 'Michael Waltz',
    date: 'Sep 19, 2025',
    desc: 'Represents U.S. interests at the United Nations in New York and coordinates multilateral diplomacy.',
    fact: 'Waltz previously served as National Security Advisor before being nominated for this post.',
  },
  {
    title: 'EPA Administrator',
    name: 'Lee Zeldin',
    date: 'Jan 20, 2025',
    desc: 'Enforces federal environmental laws protecting air quality, water, and land from pollution.',
    fact: 'The EPA sets and enforces standards affecting nearly every industry in the U.S. economy.',
  },
  {
    title: 'SBA Administrator',
    name: 'Kelly Loeffler',
    date: 'Jan 20, 2025',
    desc: 'Supports small businesses through loan guarantees, federal contracting, and disaster assistance.',
    fact: 'Former U.S. Senator from Georgia; the SBA portfolio includes over $43 billion in loan guarantees.',
  },
]

const SENIOR_MEMBERS: Member[] = [
  {
    title: 'National Security Advisor',
    name: 'Vacant',
    date: '',
    acting: true,
    desc: 'Coordinates national security policy across agencies and serves as the President\'s primary advisor on foreign and defense matters.',
    fact: 'The NSA role was created in 1953 under Eisenhower; Michael Waltz held the post before becoming UN Ambassador.',
  },
  {
    title: 'White House Counsel',
    name: 'Bill McGinley',
    date: 'Jan 20, 2025',
    desc: 'Advises the President and White House staff on legal matters, ethics rules, and constitutional questions.',
    fact: 'The White House Counsel represents the Office of the President — not the President personally.',
  },
  {
    title: 'Press Secretary',
    name: 'Karoline Leavitt',
    date: 'Jan 20, 2025',
    desc: 'Serves as the primary spokesperson for the White House and conducts daily press briefings.',
    fact: 'At 27 years old, Leavitt is the youngest White House Press Secretary in U.S. history.',
  },
  {
    title: 'OMB Director',
    name: 'Russell Vought',
    date: 'Jan 20, 2025',
    desc: 'Prepares the President\'s annual budget and oversees federal agency management and regulation review.',
    fact: 'OMB reviews every significant federal regulation before it takes effect and manages the $6+ trillion budget process.',
  },
  {
    title: 'US Trade Representative',
    name: 'Jamieson Greer',
    date: 'Confirmed 2025',
    desc: 'Negotiates trade agreements, sets tariff policy, and coordinates U.S. trade relations with 180+ countries.',
    fact: 'The USTR led implementation of tariffs covering more than $3 trillion in annual U.S. goods trade.',
  },
  {
    title: 'Deputy Chief of Staff',
    name: 'Stephen Miller',
    date: 'Jan 20, 2025',
    desc: 'Coordinates White House domestic policy development and serves as a senior advisor on immigration.',
    fact: 'Miller has served across both Trump terms as one of the most influential domestic policy architects.',
  },
  {
    title: 'DOGE',
    name: 'Elon Musk',
    date: 'Jan 20, 2025',
    note: 'Stepped back May 2026',
    desc: 'Led the Department of Government Efficiency, an advisory effort to cut federal spending and reduce regulatory burden.',
    fact: 'Musk claimed the initiative identified hundreds of billions in potential savings before stepping back in May 2026.',
  },
  {
    title: 'Sr. Counselor for Trade',
    name: 'Peter Navarro',
    date: 'Jan 20, 2025',
    desc: 'Advises the President on trade policy, tariffs, and long-term economic competition with China.',
    fact: 'One of the few economists who consistently argued for steep tariffs as a tool of economic statecraft.',
  },
  {
    title: 'Federal Reserve Chair',
    name: 'Jerome Powell',
    date: 'Term thru May 2026',
    badge: 'Independent',
    desc: 'Leads the Federal Reserve\'s Board of Governors and sets U.S. monetary policy including interest rates.',
    fact: 'The Fed is independent of the executive branch — the President cannot legally remove the Chair over policy disagreements.',
  },
  {
    title: 'Joint Chiefs Chairman',
    name: 'Gen. Dan Caine',
    date: 'Confirmed 2025',
    badge: 'Military',
    desc: 'Serves as the principal military advisor to the President, the NSC, and the Secretary of Defense.',
    fact: 'The Chairman does not command troops directly but is the highest-ranking officer in the U.S. Armed Forces.',
  },
]

export default function Administration() {
  const navigate = useNavigate()
  const [flipped, setFlipped] = useState<Set<string>>(new Set())

  useEffect(() => {
    const theme = localStorage.getItem('wsp-theme') ?? 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    return () => { document.documentElement.removeAttribute('data-theme') }
  }, [])

  const toggle = (key: string) =>
    setFlipped(prev => {
      const s = new Set(prev)
      s.has(key) ? s.delete(key) : s.add(key)
      return s
    })

  const renderCard = (m: Member, key: string) => (
    <div
      key={key}
      className={`adm-card-outer${flipped.has(key) ? ' adm-card--flipped' : ''}`}
      onClick={() => toggle(key)}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggle(key)}
      aria-pressed={flipped.has(key)}
      aria-label={`${m.title}: ${m.name}`}
    >
      <div className="adm-card-inner">
        {/* Front */}
        <div className="adm-card-front">
          <div className="adm-card-front-top">
            <div className="adm-card-title">{m.title}</div>
            {m.acting && <span className="adm-acting-badge">Acting</span>}
            {m.badge && <span className={`adm-role-badge adm-role-badge--${m.badge.toLowerCase()}`}>{m.badge}</span>}
          </div>
          <div className="adm-card-name">{m.name}</div>
          {m.date && <div className="adm-card-date">{m.date}</div>}
          {m.note && <div className="adm-card-note">{m.note}</div>}
          <div className="adm-card-flip-hint">▸ tap to flip</div>
        </div>

        {/* Back */}
        <div className="adm-card-back">
          <div className="adm-card-back-title">{m.title}</div>
          <p className="adm-card-back-desc">{m.desc}</p>
          <p className="adm-card-back-fact">{m.fact}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="adm-page">
      <button
        className="adm-back-btn"
        onClick={() => navigate('/')}
        aria-label="Go to home"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </button>

      <h1 className="adm-title">Administration</h1>
      <p className="adm-subtitle">Trump Cabinet · 47th Administration · Tap any card to flip</p>

      <div className="adm-grid">
        {MEMBERS.map((m, i) => renderCard(m, `c${i}`))}
      </div>

      <div className="adm-section-divider" role="separator">
        <span>Senior Administration</span>
      </div>

      <div className="adm-grid">
        {SENIOR_MEMBERS.map((m, i) => renderCard(m, `s${i}`))}
      </div>
    </div>
  )
}
