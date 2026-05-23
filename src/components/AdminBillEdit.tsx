import { useState } from 'react'
import type { Bill, BillLevel, Decision, Urgency } from '../types/bill'
import { FEDERAL_STAGES, MICHIGAN_STAGES, LOCAL_STAGES, OFFICE_META, ISSUE_LABELS } from '../lib/constants'

const AMEND_OPTIONS = [
  '4th', '1st', 'due', 'healthcare', 'surveillance', 'education',
  'environment', 'labor', 'housing', 'voting', 'immigration',
  'technology', 'policing', 'speech',
]

const URGENCY_OPTIONS: Urgency[]  = ['urgent', 'months', 'year', 'stalled']
const LEVEL_OPTIONS: BillLevel[]  = ['federal', 'state', 'local']

function stagesFor(level: BillLevel) {
  return level === 'federal' ? FEDERAL_STAGES
       : level === 'local'   ? LOCAL_STAGES
       : MICHIGAN_STAGES
}

interface Props {
  bill:     Bill
  onSave:   (fields: Record<string, unknown>) => Promise<void>
  onCancel: () => void
  saving:   boolean
}

export default function AdminBillEdit({ bill, onSave, onCancel, saving }: Props) {
  const initStages = stagesFor(bill.level)
  const initDates: (string | null)[] = Array.from(
    { length: initStages.length },
    (_, i) => bill.stage_dates?.[i] ?? null,
  )

  const [f, setF] = useState({
    name:             bill.name,
    bill_desc:        bill.bill_desc ?? '',
    stage:            bill.stage,
    stage_note:       bill.stage_note ?? '',
    stage_dates:      initDates,
    urgency:          bill.urgency,
    policy_bias:      bill.policy_bias,
    introduced:       bill.introduced ?? '',
    supporters:       bill.supporters ?? '',
    blockers:         bill.blockers ?? '',
    influence_window: bill.influence_window ?? '',
    ratify_office:    bill.ratify_office ?? '',
    level:            bill.level,
    municipality:     bill.municipality ?? '',
    state:            bill.state ?? '',
    amend:            [...(bill.amend ?? [])],
    issues:           [...(bill.issues ?? [])],
    decisions_json:   JSON.stringify(bill.decisions ?? [], null, 2),
    extension:        bill.extension ?? '',
  })
  const [jsonErr, setJsonErr] = useState<string | null>(null)

  function set<K extends keyof typeof f>(k: K, v: typeof f[K]) {
    setF(prev => ({ ...prev, [k]: v }))
  }

  function handleLevelChange(newLevel: BillLevel) {
    const stages = stagesFor(newLevel)
    const dates: (string | null)[] = Array.from(
      { length: stages.length },
      (_, i) => f.stage_dates[i] ?? null,
    )
    setF(prev => ({ ...prev, level: newLevel, stage_dates: dates }))
  }

  function toggleArr(field: 'amend' | 'issues', val: string) {
    setF(prev => {
      const arr = prev[field] as string[]
      return {
        ...prev,
        [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val],
      }
    })
  }

  async function handleSave() {
    let decisions: Decision[]
    try {
      decisions = JSON.parse(f.decisions_json)
      if (!Array.isArray(decisions)) throw new Error('must be an array')
      setJsonErr(null)
    } catch (e) {
      setJsonErr('Decisions must be a valid JSON array: ' + (e instanceof Error ? e.message : ''))
      return
    }

    const stages = stagesFor(f.level)
    const stage_dates: (string | null)[] = Array.from(
      { length: stages.length },
      (_, i) => f.stage_dates[i] || null,
    )

    await onSave({
      name:             f.name.trim(),
      bill_desc:        f.bill_desc.trim(),
      stage:            f.stage,
      stage_note:       f.stage_note.trim(),
      stage_dates,
      urgency:          f.urgency,
      policy_bias:      f.policy_bias,
      introduced:       f.introduced.trim(),
      supporters:       f.supporters.trim(),
      blockers:         f.blockers.trim(),
      influence_window: f.influence_window.trim(),
      ratify_office:    f.ratify_office,
      level:            f.level,
      municipality:     f.municipality.trim() || null,
      state:            f.state.toUpperCase().trim(),
      amend:            f.amend,
      issues:           f.issues,
      decisions,
      extension:        f.extension.trim() || null,
    })
  }

  const stages = stagesFor(f.level)
  const enacted = stages.length

  return (
    <div className="aef-form">
      <div className="aef-field">
        <label className="aef-label">Name</label>
        <textarea className="aef-input" value={f.name} rows={2}
          onChange={e => set('name', e.target.value)} />
      </div>

      <div className="aef-field">
        <label className="aef-label">Description</label>
        <textarea className="aef-input" value={f.bill_desc} rows={4}
          onChange={e => set('bill_desc', e.target.value)} />
      </div>

      <div className="aef-row">
        <div className="aef-field aef-half">
          <label className="aef-label">Stage</label>
          <select className="aef-select" value={f.stage}
            onChange={e => set('stage', Number(e.target.value))}>
            {stages.map((s, i) => <option key={i} value={i}>{i} — {s}</option>)}
            <option value={enacted}>{enacted} — Enacted</option>
          </select>
        </div>
        <div className="aef-field aef-half">
          <label className="aef-label">Urgency</label>
          <select className="aef-select" value={f.urgency}
            onChange={e => set('urgency', e.target.value as Urgency)}>
            {URGENCY_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="aef-field">
        <label className="aef-label">Stage dates</label>
        <div className="aef-stage-dates">
          {stages.map((s, i) => (
            <div key={i} className="aef-stage-date-row">
              <span className="aef-stage-name">{s}</span>
              <input
                className="aef-input aef-input--sm"
                type="text"
                placeholder="YYYY-MM-DD or YYYY-MM"
                value={f.stage_dates[i] ?? ''}
                onChange={e => {
                  const next = [...f.stage_dates] as (string | null)[]
                  next[i] = e.target.value || null
                  set('stage_dates', next)
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="aef-field">
        <label className="aef-label">Stage note</label>
        <textarea className="aef-input" value={f.stage_note} rows={3}
          onChange={e => set('stage_note', e.target.value)} />
      </div>

      <div className="aef-field">
        <label className="aef-label">
          Extension <span className="aef-hint">(short-term only — leave blank if full-term or none; e.g. "90-day CR through Jun 30, 2026")</span>
        </label>
        <input className="aef-input" type="text" value={f.extension}
          onChange={e => set('extension', e.target.value)} />
      </div>

      <div className="aef-field">
        <label className="aef-label">Influence window</label>
        <textarea className="aef-input" value={f.influence_window} rows={2}
          onChange={e => set('influence_window', e.target.value)} />
      </div>

      <div className="aef-field">
        <label className="aef-label">Introduced by</label>
        <textarea className="aef-input" value={f.introduced} rows={2}
          onChange={e => set('introduced', e.target.value)} />
      </div>

      <div className="aef-field">
        <label className="aef-label">Supporters</label>
        <textarea className="aef-input" value={f.supporters} rows={2}
          onChange={e => set('supporters', e.target.value)} />
      </div>

      <div className="aef-field">
        <label className="aef-label">Blockers</label>
        <textarea className="aef-input" value={f.blockers} rows={2}
          onChange={e => set('blockers', e.target.value)} />
      </div>

      <div className="aef-field">
        <label className="aef-label">
          Decisions <span className="aef-hint">(JSON array of {'{"label":"…","text":"…"}'} objects)</span>
        </label>
        <textarea
          className={`aef-input aef-input--mono${jsonErr ? ' aef-input--err' : ''}`}
          value={f.decisions_json}
          rows={6}
          onChange={e => { set('decisions_json', e.target.value); setJsonErr(null) }}
        />
        {jsonErr && <div className="aef-err-msg">{jsonErr}</div>}
      </div>

      <div className="aef-field">
        <label className="aef-label">Policy bias: {f.policy_bias} &nbsp;
          <span className="aef-hint">(0 = left · 100 = right)</span>
        </label>
        <input type="range" min={0} max={100} value={f.policy_bias}
          onChange={e => set('policy_bias', Number(e.target.value))}
          className="aef-range" />
      </div>

      <div className="aef-row">
        <div className="aef-field aef-half">
          <label className="aef-label">Level</label>
          <select className="aef-select" value={f.level}
            onChange={e => handleLevelChange(e.target.value as BillLevel)}>
            {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="aef-field aef-half">
          <label className="aef-label">Municipality</label>
          <input className="aef-input" type="text" value={f.municipality}
            onChange={e => set('municipality', e.target.value)} />
        </div>
      </div>

      <div className="aef-row">
        <div className="aef-field aef-half">
          <label className="aef-label">Ratify office</label>
          <select className="aef-select" value={f.ratify_office}
            onChange={e => set('ratify_office', e.target.value)}>
            {Object.entries(OFFICE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="aef-field aef-half">
          <label className="aef-label">State code</label>
          <input className="aef-input" type="text" value={f.state} maxLength={2}
            onChange={e => set('state', e.target.value.toUpperCase())} />
        </div>
      </div>

      <div className="aef-field">
        <label className="aef-label">Constitutional / legal tags</label>
        <div className="aef-checks">
          {AMEND_OPTIONS.map(a => (
            <label key={a} className="aef-check-item">
              <input type="checkbox" checked={f.amend.includes(a)}
                onChange={() => toggleArr('amend', a)} />
              {a}
            </label>
          ))}
        </div>
      </div>

      <div className="aef-field">
        <label className="aef-label">Issue tags</label>
        <div className="aef-checks">
          {Object.entries(ISSUE_LABELS).map(([k, v]) => (
            <label key={k} className="aef-check-item">
              <input type="checkbox" checked={f.issues.includes(k)}
                onChange={() => toggleArr('issues', k)} />
              {v}
            </label>
          ))}
        </div>
      </div>

      <div className="aef-actions">
        <button className="aef-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="aef-cancel-btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}
