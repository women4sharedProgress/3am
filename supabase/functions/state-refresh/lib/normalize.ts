/**
 * Helpers shared by every adapter and by the store.
 * DISCOVERY_RULES is copied from daily-refresh/index.ts so both functions tag
 * bills the same way. If you change the rules, change them in both places.
 */

export const DISCOVERY_RULES: Array<{ keywords: string[]; issues: string[] }> = [
  { keywords: ['reproductive', 'abortion', 'contracepti', 'planned parenthood', 'fetal', 'prenatal care'], issues: ['healthcare'] },
  { keywords: ['firearm', 'gun control', 'assault weapon', 'background check', 'second amendment', 'ammunition ban'], issues: ['policing'] },
  { keywords: ['immigration', 'border security', 'deportation', 'asylum seeker', 'refugee', 'daca', 'undocumented'], issues: ['immigration'] },
  { keywords: ['medicaid', 'medicare', 'affordable care act', 'prescription drug price', 'health insurance', 'drug pricing'], issues: ['healthcare'] },
  { keywords: ['eviction', 'rent control', 'affordable housing', 'section 8', 'fair housing', 'housing voucher'], issues: ['housing'] },
  { keywords: ['police accountability', 'qualified immunity', 'civil rights act', 'excessive force', 'law enforcement oversight'], issues: ['policing'] },
  { keywords: ['voting rights', 'voter id', 'voter suppression', 'gerrymandering', 'election integrity', 'mail-in ballot'], issues: ['voting'] },
  { keywords: ['public school', 'student loan', 'higher education', 'school choice', 'title i funding', 'pell grant'], issues: ['education'] },
  { keywords: ['climate change', 'clean energy', 'carbon emission', 'clean air act', 'clean water act', 'epa authority'], issues: ['environment'] },
  { keywords: ['lgbtq', 'transgender', 'gender identity', 'same-sex', 'conversion therapy', 'sexual orientation'], issues: ['policing'] },
  { keywords: ['minimum wage', 'worker classification', 'union organizing', 'collective bargaining', 'overtime pay', 'gig worker'], issues: ['labor'] },
  { keywords: ['surveillance', 'warrantless', 'data privacy', 'fourth amendment', 'facial recognition', 'mass surveillance'], issues: ['surveillance'] },
  { keywords: ['press freedom', 'free speech', 'social media censorship', 'first amendment', 'shield law', 'journalist'], issues: ['speech'] },
  { keywords: ['artificial intelligence', 'ai regulation', 'algorithmic', 'autonomous weapon', 'deepfake'], issues: ['technology'] },
  { keywords: ['criminal sentencing', 'mandatory minimum', 'cash bail', 'prison reform', 'recidivism', 'solitary confinement'], issues: ['policing'] },
]

export function guessIssues(title: string): string[] {
  const t = (title ?? '').toLowerCase()
  const found = new Set<string>()
  for (const rule of DISCOVERY_RULES) {
    if (rule.keywords.some(kw => t.includes(kw))) rule.issues.forEach(i => found.add(i))
  }
  return [...found]
}

/**
 * Canonical bill key used to match a source bill to an existing DB row when
 * pull_source differs (e.g. a state switched from LegiScan to its own API).
 *   "SB 123" / "S.B. 0123" / "SB0123" → "SB123"
 *   "H.R. 45"                         → "HR45"
 */
export function billKey(billNumber: string): string {
  const s = (billNumber ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const m = s.match(/^([A-Z]+)0*(\d+)([A-Z]?)$/)
  return m ? `${m[1]}${m[2]}${m[3]}` : s
}

/** "SB 123 — Title" → "SB 123" (the part of bills.name before the dash) */
export function billNumberFromName(name: string): string {
  return (name ?? '').split(' — ')[0].trim()
}

export function formatBillName(billNumber: string, title: string): string {
  const num = (billNumber ?? '').trim()
  return title ? `${num} — ${title.trim()}` : num
}

/** Accepts "2026-03-04", "2026-03-04T10:00:00", "03/04/2026" → "2026-03-04" */
export function isoDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
  return null
}

/** Same convention as daily-refresh inferRatifyOffice (keeps OFFICE_META codes) */
export function inferRatifyOffice(stage: number, state: string): string {
  const p = state.toLowerCase()
  if (stage <= 1) return 'committee'
  if (stage === 2) return `${p}-senate`
  if (stage === 3) return `${p}-house`
  return 'governor'
}

export function mergeStageDates(
  current: (string | null)[] | null | undefined,
  stage: number,
  stageDate: string | null,
  stageCount: number,
): (string | null)[] {
  const arr: (string | null)[] = Array.isArray(current) ? [...current] : Array(stageCount).fill(null)
  while (arr.length < stageCount) arr.push(null)
  if (stage >= 0 && stage < arr.length && stageDate) arr[stage] = stageDate
  return arr
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** fetch with timeout + one retry on network error / 429 / 5xx */
export async function fetchWithRetry(url: string, init: RequestInit = {}, timeoutMs = 20_000): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      if ((res.status === 429 || res.status >= 500) && attempt === 0) {
        await res.body?.cancel()
        await sleep(2000)
        continue
      }
      return res
    } catch (e) {
      if (attempt === 1) throw e
      await sleep(2000)
    } finally {
      clearTimeout(t)
    }
  }
  throw new Error(`fetch failed: ${url}`)
}

/** Remove API keys from any URL before it is stored or logged */
export function stripKey(url: string): string {
  return url.replace(/([?&])(key|api_key|apikey|token)=[^&]*&?/gi, '$1').replace(/[?&]$/, '')
}
