/**
 * New York — NY Senate Open Legislation API v3 (official, free key)
 * Docs: https://legislation.nysenate.gov/static/docs/html/
 *
 * Secret: NY_OPENLEG_API_KEY
 *
 * Status: field names follow the published v3 docs but have NOT been tested
 * against the live API yet. Run once with { "states": ["NY"], "dryRun": true }
 * and check the output before turning NY on.
 */

import { NormalizedBill, StateAdapter } from '../lib/types.ts'
import { fetchWithRetry, isoDate, sleep } from '../lib/normalize.ts'

const BASE = 'https://legislation.nysenate.gov/api/3'
const KEY = Deno.env.get('NY_OPENLEG_API_KEY') ?? ''
const PAGE = 1000

/** NY sessions are two-year, starting in odd years (2025, 2027, ...) */
function sessionYear(d = new Date()): number {
  const y = d.getUTCFullYear()
  return y % 2 === 1 ? y : y - 1
}

function mapStatus(statusType: string): number {
  switch ((statusType ?? '').toUpperCase()) {
    case 'SIGNED_BY_GOV':
    case 'POCKET_APPROVED':
    case 'ADOPTED':           return 5
    case 'DELIVERED_TO_GOV':
    case 'VETOED':            return 4
    case 'PASSED_SENATE':
    case 'PASSED_ASSEMBLY':   return 2
    case 'SENATE_FLOOR':
    case 'ASSEMBLY_FLOOR':    return 2
    case 'IN_SENATE_COMM':
    case 'IN_ASSEMBLY_COMM':
    case 'INTRODUCED':        return 1
    default:                  return 0
  }
}

export const ny: StateAdapter = {
  id: 'ny',

  async listBills() {
    if (!KEY) throw new Error('NY_OPENLEG_API_KEY not set')
    const year = sessionYear()
    const out: NormalizedBill[] = []
    let offset = 1   // Open Legislation offsets are 1-based

    while (true) {
      const url = `${BASE}/bills/${year}?limit=${PAGE}&offset=${offset}&key=${KEY}`
      const res = await fetchWithRetry(url, {}, 30_000)
      if (!res.ok) throw new Error(`NY bills HTTP ${res.status}`)
      const json = await res.json()
      if (json.success === false) throw new Error(`NY: ${json.message ?? 'error'}`)

      const items: Record<string, any>[] = json.result?.items ?? []
      for (const i of items) {
        const printNo = i.basePrintNo ?? i.printNo
        if (!printNo) continue
        out.push({
          sourceId:   `${year}/${printNo}`,
          billNumber: printNo,                          // e.g. "S1234", "A5678"
          title:      i.title ?? '',
          stage:      mapStatus(i.status?.statusType),
          stageDate:  isoDate(i.status?.actionDate),
          lastAction: i.status?.statusDesc ?? null,
          introduced: isoDate(i.publishedDateTime),
          committee:  i.status?.committeeName || null,
          pullSource: `${BASE}/bills/${year}/${printNo}`,
          raw:        i,
        })
      }

      const total = Number(json.total ?? 0)
      offset += PAGE
      if (items.length === 0 || offset > total) break
      await sleep(250)
    }
    return out
  },
}
