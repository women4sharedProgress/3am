import type { CSSProperties } from 'react'
import type { Bill } from '../types/bill'
import { FEDERAL_STAGES, MICHIGAN_STAGES, LOCAL_STAGES } from '../lib/constants'

function fmtDate(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00')
    const day = String(d.getDate()).padStart(2, '0')
    const mon = d.toLocaleDateString('en-US', { month: 'short' })
    const yy = String(d.getFullYear()).slice(2)
    return `${day} ${mon} ${yy}`
  }
  if (/^\d{4}-\d{2}$/.test(s)) {
    const d = new Date(s + '-01T00:00:00')
    const mon = d.toLocaleDateString('en-US', { month: 'short' })
    const yy = String(d.getFullYear()).slice(2)
    return `${mon} ${yy}`
  }
  return s
}

function pipelineColor(policyBias: number): string {
  if (policyBias < 40) return '#C84040'
  if (policyBias > 60) return '#3060C0'
  return '#764AAB'
}

type StepDef = {
  label: string
  date?: string
  isDone: boolean
  isCurr: boolean
  isStall: boolean
  isExt: boolean
}

function buildSteps(bill: Bill, stages: string[], isStalled: boolean): StepDef[] {
  const dates = bill.stage_dates ?? []
  const hasExt = !!bill.extension
  const steps: StepDef[] = []

  stages.forEach((label, i) => {
    // When extension is active, stage[4] is treated as "done" even when bill.stage === 4
    const isDone  = hasExt && i === 4 ? bill.stage >= 4 : i < bill.stage
    const isCurr  = !isDone && i === bill.stage && !isStalled && !(hasExt && i === 4)
    const isStall = !isDone && i === bill.stage &&  isStalled && !(hasExt && i === 4)

    steps.push({ label, date: dates[i] ?? undefined, isDone, isCurr, isStall, isExt: false })

    // Insert Extension step immediately after stage index 4
    if (i === 4 && hasExt) {
      steps.push({
        label: 'Extension',
        isDone:  bill.stage > 4,
        isCurr:  bill.stage === 4 && !isStalled,
        isStall: bill.stage === 4 &&  isStalled,
        isExt:   true,
      })
    }
  })

  return steps
}

export default function Pipeline({ bill }: { bill: Bill }) {
  const stages = bill.level === 'federal' ? FEDERAL_STAGES
               : bill.level === 'local'   ? LOCAL_STAGES
               : MICHIGAN_STAGES
  const isStalled = bill.urgency === 'stalled'
  const activeColor = pipelineColor(bill.policy_bias)
  const steps = buildSteps(bill, stages, isStalled)

  return (
    <div className="pipeline-section">
      <div className="pipeline-head">Legislative path</div>
      <div className="pipeline">
        {steps.map((step, i) => {
          let cls = 'pipe-step'
          if (step.isDone)       cls += ' done'
          else if (step.isCurr)  cls += ' curr'
          else if (step.isStall) cls += ' stalled'

          const stepStyle = (step.isDone || step.isCurr)
            ? { '--pipe-active-color': activeColor } as CSSProperties
            : undefined

          const dotStyle: CSSProperties = (step.isDone || step.isCurr)
            ? { background: activeColor, borderColor: activeColor }
            : {}

          return (
            <div key={i} className={cls} style={stepStyle}>
              <div className="pipe-dot" style={dotStyle} />
              <div className="pipe-label">
                {step.label}
                {step.date && <div className="pipe-date">{fmtDate(step.date)}</div>}
                {step.isExt && bill.extension && (
                  <div className="pipe-date">{bill.extension}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {bill.extension && (
        <div className="stage-note" style={{ marginBottom: bill.stage_note ? 6 : undefined }}>
          Short-term extension signed — operations are authorized temporarily. This is not full passage; the underlying legislation is still pending.
        </div>
      )}
      <div className="stage-note">{bill.stage_note}</div>
    </div>
  )
}
