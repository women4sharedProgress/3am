/**
 * Shared types for the state ingestion pipeline.
 *
 * Every state source (official API, bulk file, scraper, or LegiScan) is an
 * "adapter". An adapter's only job is to turn that source's data into
 * NormalizedBill objects. Everything after that (matching, verified-card
 * protection, discovery, inserts) is shared and lives in lib/store.ts.
 */

// Generic state pipeline — matches STATE_STAGES in src/lib/constants.ts
//   0 Introduced · 1 Committee · 2 First chamber · 3 Second chamber · 4 Governor
//   stage === 5 means enacted (stage === stages.length)
export const STATE_STAGE_COUNT = 5

export interface NormalizedBill {
  /** Stable ID inside the source (LegiScan bill_id, NY print number, ...) */
  sourceId: string
  /** Bill number as the state writes it, e.g. "SB 123", "HB 45", "S1234" */
  billNumber: string
  title: string
  /** 0–5, see STATE_STAGE_COUNT above */
  stage: number
  /** ISO date (YYYY-MM-DD) of the latest action, if known */
  stageDate: string | null
  /** Latest action text, if known */
  lastAction: string | null
  /** ISO date introduced. null = source didn't say (existing value is kept) */
  introduced: string | null
  /** Current committee. null = source didn't say (existing value is kept) */
  committee: string | null
  /** URL written to bills.pull_source — must be stable for the same bill */
  pullSource: string
  /** Full source payload, stored in bills.raw_pull_data */
  raw: unknown
}

export interface StateAdapter {
  /** Short id stored in state_sources.adapter, e.g. 'legiscan', 'ny' */
  id: string
  /** Fetch the current session's bills for one state. Throw on failure. */
  listBills(state: string): Promise<NormalizedBill[]>
  /**
   * Optional: fill in fields the list call doesn't return (introduced,
   * committee). Only called for NEW bills about to be inserted, so cheap
   * list calls do the nightly work and expensive detail calls stay rare.
   */
  getDetails?(bill: NormalizedBill): Promise<NormalizedBill>
}

export interface StateRunResult {
  state: string
  adapter: string
  fetched: number
  updated: number
  pending: number
  unchanged: number
  discovered: number
  error?: string
  ms: number
}
