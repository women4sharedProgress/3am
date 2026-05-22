import { useRef, useState } from 'react'
import { getStatus, setStatus } from '../lib/billStatus'
import type { BillStatus } from '../lib/billStatus'
import { useAuth } from '../contexts/AuthContext'

const AMEND_TOOLTIPS: Record<string, string> = {
  '4th':          '4th Amendment',
  '1st':          '1st Amendment',
  'due':          'Due Process / 14th Amendment',
  'healthcare':   'Healthcare',
  'surveillance': 'Surveillance & Privacy',
  'education':    'Education',
  'environment':  'Environment',
  'labor':        'Labor & Wages',
  'housing':      'Housing',
  'voting':       'Voting Rights',
  'immigration':  'Immigration',
  'technology':   'Technology & AI',
  'policing':     'Policing & Justice',
  'speech':       'Press & Speech',
}
import type { Bill } from '../types/bill'
import { policyBarStyle, isEnacted } from '../lib/billUtils'

function parseCssStyle(css: string): React.CSSProperties {
  const obj: Record<string, string> = {}
  css.split(';').forEach(part => {
    const [prop, ...vals] = part.split(':')
    if (prop && vals.length) obj[prop.trim()] = vals.join(':').trim()
  })
  return obj as React.CSSProperties
}
import { OFFICE_META } from '../lib/constants'
import Pipeline from './Pipeline'
import Decisions from './Decisions'

export default function BillCard({ bill }: { bill: Bill }) {
  const copyBtnRef = useRef<HTMLButtonElement>(null)
  const { user } = useAuth()
  const [status, setLocalStatus] = useState<BillStatus>(() => getStatus(bill.id))

  function handleStatus(s: NonNullable<BillStatus>) {
    const next: BillStatus = status === s ? null : s
    setStatus(bill.id, next)
    setLocalStatus(next)
  }
  const offMeta = OFFICE_META[bill.ratify_office] ?? { label: bill.ratify_office, dotCls: 'od-com' }

  const lvlTag = bill.level === 'federal'
    ? <span className="tag tag-fed">🇺🇸 Federal</span>
    : bill.level === 'local'
    ? <span className="tag tag-local">📍 {bill.municipality}</span>
    : <span className="tag tag-mi">Michigan</span>

  const urgTag = isEnacted(bill)             ? null
               : bill.urgency === 'urgent'  ? <span className="tag tag-now">Act now</span>
               : bill.urgency === 'months'  ? <span className="tag tag-months">Months</span>
               : bill.urgency === 'stalled' ? <span className="tag tag-stalled">Stalled</span>
               :                             <span className="tag tag-year">Session</span>

  async function handleCopy() {
    const btn = copyBtnRef.current
    if (!btn) return
    const divider = '—'.repeat(55)
    const lines = [
      bill.name,
      divider,
      bill.bill_desc,
      '',
      'LEGISLATIVE STATUS',
      bill.stage_note,
      '',
      'PUBLIC INFLUENCE WINDOW',
      bill.influence_window,
      '',
      'INTRODUCED BY',
      bill.introduced,
      '',
      'KEY SUPPORTERS',
      bill.supporters,
      '',
      'KEY BLOCKERS',
      bill.blockers,
      '',
      'WHAT IS BEING DECIDED',
      ...bill.decisions.map(d => `  → ${d.label} — ${d.text}`),
      '',
      divider,
      `Level: ${bill.level}${bill.municipality ? ` (${bill.municipality})` : ''} | Timing: ${bill.urgency} | Currently with: ${offMeta.label}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(lines)
      btn.classList.add('copied')
      btn.title = 'Copied!'
      setTimeout(() => { btn.classList.remove('copied'); btn.title = 'Copy card to clipboard' }, 1400)
    } catch {
      btn.title = 'Copy failed'
    }
  }

  function renderIntroduced(text: string) {
    const entries = text.split(/;\s*/).map(e => e.replace(/ — /g, ': ').trim()).filter(Boolean)
    if (entries.length <= 1) return <>{entries[0] ?? text}</>
    return <>{entries.map((e, i) => <div key={i} className="field-demand">• {e}</div>)}</>
  }

  function renderWithDemand(text: string) {
    const idx = text.indexOf(' — ')
    if (idx === -1) return <>{text}</>
    const names = text.slice(0, idx)
    const demand = text.slice(idx + 3)
    return (
      <>
        {names}
        <div className="field-demand">• {demand}</div>
      </>
    )
  }

  return (
    <div className="bill">
      <div className="policy-bar" style={parseCssStyle(policyBarStyle(bill.policy_bias))}>
        <span className="policy-bar-label">Policy direction</span>
      </div>

      <div className="card-top-tags">
        {lvlTag}
        {urgTag}
      </div>

      <button ref={copyBtnRef} className="copy-btn" onClick={handleCopy} title="Copy">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>

      <div className="bill-name-row">
        <div className="bill-name">
          {bill.name}
          {bill.amend.map(a => <span key={a} className="amend-tag" title={AMEND_TOOLTIPS[a] ?? a}>{a}</span>)}
        </div>
        {user && (
          <div className="bill-status-dots">
            {(['alert', 'watch', 'archive'] as const).map(s => (
              <button
                key={s}
                className={`bill-status-dot bill-status-dot--${s}${status === s ? ' active' : ''}`}
                onClick={() => handleStatus(s)}
                data-label={s.charAt(0).toUpperCase() + s.slice(1)}
                aria-label={status === s ? `Remove from ${s}` : s.charAt(0).toUpperCase() + s.slice(1)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bill-desc">{bill.bill_desc}</div>

      <Pipeline bill={bill} />

      <div className="meta-grid">
        <div>
          <div className="lbl">Public influence window</div>
          <div className="val">{bill.influence_window}</div>
        </div>
        <div>
          <div className="lbl">Introduced by</div>
          <div className="val">{renderIntroduced(bill.introduced)}</div>
        </div>
        <div className="full-width">
          <div className="lbl">Key supporters</div>
          <div className="val">{renderWithDemand(bill.supporters)}</div>
        </div>
        <div className="full-width">
          <div className="lbl">Key blockers</div>
          <div className="val">{renderWithDemand(bill.blockers)}</div>
        </div>
      </div>

      <div className="deciding-divider"><span>What is being decided</span></div>

      <Decisions decisions={bill.decisions} />

      <div className="card-footer-row">
        <div className="office-badge">
          <span className="office-badge-label">
            <span className={`office-dot ${offMeta.dotCls}`} />
            {offMeta.label}
          </span>
        </div>
        <button
          className="bill-scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="Return to Top"
          aria-label="Return to Top"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
