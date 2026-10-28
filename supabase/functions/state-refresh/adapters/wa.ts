/**
 * Washington — WA Legislature Web Services (official, free, no key)
 * Docs: https://wslwebservices.leg.wa.gov/LegislationService.asmx
 *
 * One call per night: GetLegislationIntroducedSince(start of biennium) returns
 * every bill version with title, introduced date, and current status.
 *
 * WA lists each version of a bill separately (HB 1024, SHB 1024, 2SHB 1024).
 * We collapse them to one bill per number ("HB 1024") and take status from the
 * version marked Active (the one that can move on the floor).
 *
 * Status strings seen live (Oct 2026): "H Approps", "H Rules X", "H Rules 3C",
 * "H subst for", "C 14 L 25" (= Chapter 14, Laws of 2025 → enacted).
 *
 * Secrets: none.
 */

import type { NormalizedBill, StateAdapter } from '../lib/types.ts'
import { fetchWithRetry, isoDate } from '../lib/normalize.ts'
import { blocks, text, without } from '../lib/xml.ts'

const BASE = 'https://wslwebservices.leg.wa.gov/LegislationService.asmx'

/** WA bienniums start in odd years: 2025-26, 2027-28, ... */
export function biennium(d = new Date()): { start: number; label: string } {
  const y = d.getUTCFullYear()
  const start = y % 2 === 1 ? y : y - 1
  return { start, label: `${start}-${String(start + 1).slice(2)}` }
}

/**
 * WA status → 0–5 pipeline stage.
 * origin = 'H' or 'S' (chamber the bill started in).
 */
export function mapStatus(status: string, origin: string, veto: boolean, partialVeto: boolean): number {
  const s = (status ?? '').trim()
  if (/^C \d+ L \d+/i.test(s) || partialVeto) return 5          // chaptered = law
  if (veto || /veto/i.test(s)) return 4                           // vetoed at governor
  if (/gov/i.test(s)) return 4                                    // "Del to Gov", "Gov signed"
  if (/passed leg|spkr signed|pres signed|conf/i.test(s)) return 3 // passed both chambers
  const chamber = s.match(/^([HS]) /)?.[1]
  if (chamber && chamber !== origin) return 2                     // now in the other chamber
  if (/passed 3rd/i.test(s)) return 2                             // passed its own chamber
  if (/prefiled|^$/i.test(s)) return 0
  return 1                                                        // committee / rules / floor in origin chamber
}

interface Version {
  billId: string        // "2SHB 1024"
  number: string        // "1024"
  type: string          // "B", "JM", "JR", ...
  origin: string        // "H" | "S"
  active: boolean
  sub: number
  eng: number
  title: string
  introduced: string | null
  status: string
  historyLine: string | null
  actionDate: string | null
  veto: boolean
  partialVeto: boolean
  raw: Record<string, unknown>
}

export function parseVersions(xml: string): Version[] {
  return blocks(xml, 'Legislation').map(block => {
    const cs = blocks(block, 'CurrentStatus')[0] ?? ''
    const top = without(without(without(block, 'CurrentStatus'), 'Companions'), 'ShortLegislationType')
    const agency = text(top, 'OriginalAgency') ?? ''
    const v: Version = {
      billId:      text(top, 'BillId') ?? '',
      number:      text(top, 'BillNumber') ?? '',
      type:        text(block, 'ShortLegislationType') ?? 'B',   // inner tag holds the code
      origin:      agency.charAt(0).toUpperCase(),
      active:      text(top, 'Active') === 'true',
      sub:         Number(text(top, 'SubstituteVersion') ?? 0),
      eng:         Number(text(top, 'EngrossedVersion') ?? 0),
      title:       text(top, 'LongDescription') ?? text(top, 'ShortDescription') ?? '',
      introduced:  isoDate(text(top, 'IntroducedDate')),
      status:      text(cs, 'Status') ?? '',
      historyLine: text(cs, 'HistoryLine'),
      actionDate:  isoDate(text(cs, 'ActionDate')),
      veto:        text(cs, 'Veto') === 'true',
      partialVeto: text(cs, 'PartialVeto') === 'true',
      raw:         {},
    }
    v.raw = {
      billId: v.billId, active: v.active, status: v.status, historyLine: v.historyLine,
      actionDate: v.actionDate, shortDescription: text(top, 'ShortDescription'),
      sponsor: text(top, 'Sponsor'), introduced: v.introduced,
    }
    return v
  })
}

/** Collapse HB/SHB/2SHB/E2SHB versions into one bill per base number. */
export function collapse(versions: Version[], bienniumLabel: string): NormalizedBill[] {
  const groups = new Map<string, Version[]>()
  for (const v of versions) {
    if (!v.number || (v.origin !== 'H' && v.origin !== 'S')) continue
    const base = `${v.origin}${v.type} ${v.number}`          // "HB 1024", "SJM 8001"
    const g = groups.get(base) ?? []
    g.push(v)
    groups.set(base, g)
  }

  const out: NormalizedBill[] = []
  for (const [base, g] of groups) {
    // Current version: Active first, then highest substitute/engrossed number
    const cur = [...g].sort((a, b) =>
      Number(b.active) - Number(a.active) || b.sub - a.sub || b.eng - a.eng)[0]
    const introduced = g.map(v => v.introduced).filter(Boolean).sort()[0] ?? null
    const stage = mapStatus(cur.status, cur.origin, cur.veto, cur.partialVeto)
    // "H Approps" / "S Law & Justice" = sitting in a committee (either chamber)
    const inCommittee = stage <= 2 && /^[HS] /.test(cur.status) &&
      !/rules|read|passed|floor|subst/i.test(cur.status)

    out.push({
      sourceId:   `${bienniumLabel}/${base.replace(' ', '')}`,
      billNumber: base,
      title:      cur.title || g.find(v => v.title)?.title || '',
      stage,
      stageDate:  cur.actionDate,
      lastAction: cur.historyLine ?? (cur.status || null),
      introduced,
      committee:  inCommittee ? cur.status.replace(/^[HS] /, '') : null,
      pullSource: `${BASE}/GetLegislation?biennium=${bienniumLabel}&billNumber=${cur.number}`,
      raw:        { currentVersion: cur.billId, wsStatus: cur.status, versions: g.map(v => v.raw) },
    })
  }
  return out
}

export const wa: StateAdapter = {
  id: 'wa',

  async listBills() {
    const { start, label } = biennium()
    const url = `${BASE}/GetLegislationIntroducedSince?sinceDate=${start}-01-01`
    const res = await fetchWithRetry(url, {}, 90_000)   // large response (all versions, full biennium)
    if (!res.ok) throw new Error(`WA GetLegislationIntroducedSince HTTP ${res.status}`)
    const xml = await res.text()
    return collapse(parseVersions(xml), label)
  },
}
