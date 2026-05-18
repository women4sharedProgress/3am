import { syncBillStatus, syncAllBillStatuses, fetchStatusesFromDb } from './notificationClient'
import { userKey } from './userKey'

export type BillStatus = 'alert' | 'watch' | 'archive' | null

function getAll(): Record<number, BillStatus> {
  try { return JSON.parse(localStorage.getItem(userKey('wsp-bill-status')) ?? '{}') } catch { return {} }
}

export function getStatus(id: number): BillStatus {
  return getAll()[id] ?? null
}

export function setStatus(id: number, status: BillStatus) {
  const all = getAll()
  if (status === null) delete all[id]
  else all[id] = status
  localStorage.setItem(userKey('wsp-bill-status'), JSON.stringify(all))
  window.dispatchEvent(new CustomEvent('bill-status-change'))
  // Background DB sync — silently ignored if not logged in (returns 401)
  syncBillStatus([{ bill_id: id, status }]).catch(() => {})
}

export function getIdsByStatus(status: 'alert' | 'watch' | 'archive'): Set<number> {
  const all = getAll()
  return new Set(
    Object.entries(all)
      .filter(([, v]) => v === status)
      .map(([k]) => Number(k))
  )
}

// Call once after login: pull DB statuses, merge into localStorage (DB wins),
// push any local-only entries up to DB, then fire bill-status-change.
export function syncStatusesAfterLogin(): void {
  fetchStatusesFromDb().then(dbStatuses => {
    if (!dbStatuses) {
      // DB fetch failed — fall back to pushing local entries only
      const all = getAll() as Record<string, string>
      if (Object.keys(all).length > 0) syncAllBillStatuses(all).catch(() => {})
      return
    }

    const local = getAll() as Record<string, string>
    const dbMap: Record<string, string> = {}
    for (const { bill_id, status } of dbStatuses) dbMap[String(bill_id)] = status

    // Merge: DB wins for any bill that exists in DB; local-only entries are preserved.
    const merged: Record<string, string> = { ...local, ...dbMap }
    localStorage.setItem(userKey('wsp-bill-status'), JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent('bill-status-change'))

    // Push local-only entries (those not already in DB) up to the DB.
    const dbIds = new Set(Object.keys(dbMap))
    const localOnly = Object.entries(local)
      .filter(([id]) => !dbIds.has(id))
      .map(([id, status]) => ({ bill_id: Number(id), status }))
    if (localOnly.length > 0) syncBillStatus(localOnly).catch(() => {})
  }).catch(() => {})
}
