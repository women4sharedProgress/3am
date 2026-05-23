import type { Bill, ActiveFilters } from '../types/bill'
import { FEDERAL_STAGES, MICHIGAN_STAGES, LOCAL_STAGES } from './constants'

function stageCount(bill: Bill): number {
  if (bill.level === 'federal') return FEDERAL_STAGES.length
  if (bill.level === 'local')   return LOCAL_STAGES.length
  return MICHIGAN_STAGES.length
}

export function isEnacted(bill: Bill): boolean {
  return bill.stage >= stageCount(bill)
}

export function getEnactedDate(bill: Bill): Date | null {
  const raw = bill.stage_dates[stageCount(bill) - 1]
  if (!raw) return null
  const iso = /^\d{4}-\d{2}$/.test(raw) ? raw + '-01' : raw
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

function enactedWithinDays(bill: Bill, days: number): boolean {
  const lastIdx = stageCount(bill) - 1
  const raw = bill.stage_dates[lastIdx]
  if (!raw) return true
  const iso = /^\d{4}-\d{2}$/.test(raw) ? raw + '-01' : raw
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return true
  return (Date.now() - d.getTime()) <= days * 86_400_000
}

export function policyBarStyle(bias: number): string {
  if (bias >= 38 && bias <= 62) return 'background:#4F4262'
  return `background:linear-gradient(to right,var(--bar-lib) ${bias}%,var(--bar-con) ${bias}%)`
}

export function policyCategory(bias: number): 'liberal' | 'center' | 'conservative' {
  if (bias >= 63) return 'liberal'
  if (bias <= 37) return 'conservative'
  return 'center'
}

export function filterBills(bills: Bill[], active: ActiveFilters): Bill[] {
  return bills.filter(b => {
    if (active.search) {
      const q = active.search.toLowerCase()
      const hay = (b.name + ' ' + b.bill_desc + ' ' + (b.municipality ?? '')).toLowerCase()
      if (!hay.includes(q)) return false
    }
    if (active.level !== 'all' && b.level !== active.level) return false
    if (active.state !== 'all' && b.state !== 'US' && b.state !== active.state) return false
    if (active.city !== 'all' && b.level === 'local' && b.municipality !== active.city) return false

    if (active.timing === 'enacted') {
      if (!isEnacted(b)) return false
    } else if (isEnacted(b)) {
      if (active.timing !== 'all' || !enactedWithinDays(b, 7)) return false
    } else {
      const timingVal = active.timing === 'session' ? 'year' : active.timing
      if (active.timing !== 'all' && b.urgency !== timingVal) return false
    }

    if (active.impact !== 'all') {
      const f = active.impact
      if (f === '4th' && !b.amend.includes('4th')) return false
      if (f === '1st' && !b.amend.includes('1st')) return false
      if (f === 'due' && !b.amend.includes('due') && !b.amend.includes('14th')) return false
    }
    if (active.issue !== 'all' && !b.issues.includes(active.issue)) return false
    if (active.policy !== 'all' && policyCategory(b.policy_bias) !== active.policy) return false
    if (active.office !== 'all' && b.ratify_office !== active.office) return false
    if (active.committee !== 'all' && b.committee !== active.committee) return false
    return true
  })
}
