/**
 * LegiScan adapter — fallback for states with no usable official source.
 *
 * Quota use per state per night: 2 calls (getSessionList + getMasterList),
 * plus 1 getBill per NEW bill inserted (max 20). Existing bills are refreshed
 * from the master list alone, so tracking more bills costs nothing extra.
 *
 * Secret: LEGISCAN_API_KEY
 */

import { NormalizedBill, StateAdapter } from '../lib/types.ts'
import { fetchWithRetry, isoDate } from '../lib/normalize.ts'

const BASE = 'https://api.legiscan.com'
const KEY = Deno.env.get('LEGISCAN_API_KEY') ?? ''

// LegiScan status codes are the same for every state
function mapStatus(s: number): number {
  switch (s) {
    case 8:  return 5  // Chaptered (enacted)
    case 4:  return 4  // Passed → governor
    case 7:  return 4  // Override
    case 3:  return 3  // Enrolled (both chambers)
    case 2:  return 2  // Engrossed (first chamber)
    case 10: return 2  // Report pass
    case 9:  return 1  // Referred to committee
    case 1:  return 1  // Introduced
    default: return 0
  }
}

async function get(op: string, params: Record<string, string | number>) {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
  const res = await fetchWithRetry(`${BASE}/?key=${KEY}&op=${op}&${qs}`)
  if (!res.ok) throw new Error(`LegiScan ${op} HTTP ${res.status}`)
  const json = await res.json()
  if (json.status === 'ERROR') throw new Error(`LegiScan ${op}: ${json.alert?.message ?? 'error'}`)
  return json
}

// Must match the pull_source format daily-refresh used, so existing rows match
const pullSource = (billId: number | string) => `${BASE}/?op=getBill&id=${billId}`

export const legiscan: StateAdapter = {
  id: 'legiscan',

  async listBills(state) {
    if (!KEY) throw new Error('LEGISCAN_API_KEY not set')
    const sess = await get('getSessionList', { state })
    const active = (sess.sessions ?? [])
      .filter((s: { sine_die: number }) => !s.sine_die)
      .sort((a: { year_start: number }, b: { year_start: number }) => b.year_start - a.year_start)[0]
    if (!active) throw new Error(`No active ${state} session in LegiScan`)

    const ml = await get('getMasterList', { id: active.session_id })
    const items = Object.values(ml.masterlist ?? {}).filter(
      (v): v is Record<string, unknown> => typeof v === 'object' && v !== null && 'bill_id' in v,
    )
    return items.map((i): NormalizedBill => ({
      sourceId:   String(i.bill_id),
      billNumber: String(i.number ?? ''),
      title:      String(i.title ?? ''),
      stage:      mapStatus(Number(i.status)),
      stageDate:  isoDate(i.last_action_date as string),
      lastAction: (i.last_action as string) || null,
      introduced: null,   // not in master list → filled by getDetails for new bills
      committee:  null,
      pullSource: pullSource(i.bill_id as number),
      raw:        i,
    }))
  },

  async getDetails(b) {
    const { bill } = await get('getBill', { id: b.sourceId })
    if (!bill) return b
    return {
      ...b,
      introduced: isoDate(bill.introduced_date) ?? b.introduced,
      committee:  bill.committee?.name ?? b.committee,
      raw:        bill,
    }
  },
}
