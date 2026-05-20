const BASE = '/functions/v1'

export interface AppNotification {
  id:         string
  bill_id:    number | null
  type:       string
  title:      string
  body:       string
  read:       boolean
  created_at: string
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  try {
    const res = await fetch(`${BASE}/functions/v1/notifications-list`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.notifications ?? []
  } catch { return [] }
}

export async function markAllRead(): Promise<void> {
  try {
    await fetch(`${BASE}/functions/v1/notifications-read`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
  } catch { /* ignore */ }
}

export async function syncAlertSettings(settings: unknown): Promise<void> {
  try {
    await fetch(`${BASE}/functions/v1/alert-settings-save`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
  } catch { /* ignore */ }
}

export async function syncBillStatus(
  changes: Array<{ bill_id: number; status: string | null }>,
): Promise<void> {
  try {
    await fetch(`${BASE}/functions/v1/bill-status-sync`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    })
  } catch { /* ignore */ }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - base64.length % 4) % 4)
  const bin = atob(padded)
  return Uint8Array.from({ length: bin.length }, (_, i) => bin.charCodeAt(i))
}

export async function subscribeToPush(vapidPublicKey: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
    const json = sub.toJSON()
    await fetch(`${BASE}/functions/v1/push-subscribe`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    })
    return true
  } catch (e) {
    console.error('[push] subscribe failed:', e)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await fetch(`${BASE}/functions/v1/push-subscribe`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unsubscribe', endpoint: sub.endpoint }),
    })
    await sub.unsubscribe()
  } catch { /* ignore */ }
}

export async function syncAllBillStatuses(statuses: Record<string, string>): Promise<void> {
  const changes = Object.entries(statuses).map(([id, status]) => ({
    bill_id: Number(id),
    status,
  }))
  if (changes.length > 0) await syncBillStatus(changes)
}

export async function fetchStatusesFromDb(): Promise<Array<{ bill_id: number; status: string }> | null> {
  try {
    const res = await fetch(`${BASE}/functions/v1/bill-status-sync`, {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.statuses as Array<{ bill_id: number; status: string }>) ?? null
  } catch { return null }
}
