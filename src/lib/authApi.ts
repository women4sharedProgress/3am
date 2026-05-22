// Always use a relative path so requests route through the active proxy:
//   dev        → Vite proxy (vite.config.ts server.proxy)
//   production → Vercel rewrite (vercel.json)
// Both forward /functions/v1/* to Supabase. A relative path means the cookie is
// always same-origin (never third-party), which is required for httpOnly cookies.
// VITE_FUNCTIONS_BASE is intentionally ignored here — do not re-introduce it.
const BASE = '/functions/v1'

function headers() {
  return { 'Content-Type': 'application/json' }
}

async function post(path: string, body: object) {
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method:      'POST',
      headers:     headers(),
      credentials: 'include',
      body:        JSON.stringify(body),
    })
    return res.json()
  } catch {
    return { ok: false, error: 'Network error; check your connection.' }
  }
}

// Session token is now in an httpOnly cookie — not a parameter.
export function authCheck(username: string) {
  return post('auth-check', { username })
}

export function authSignin(username: string, credential: string, mode: 'passcode' | 'password', remember = true) {
  return post('auth-signin', { username, credential, mode, remember })
}

// No body needed — cookie is sent automatically by the browser.
export function authValidate() {
  return post('auth-validate', {})
}

// Session token read from cookie server-side — not sent in body.
export function authSensitive(username: string, password: string) {
  return post('auth-sensitive', { username, password })
}

// Cookie cannot be cleared by JS — must call server to set Max-Age=0.
export function authSignout() {
  return post('auth-signout', {})
}

export function authRegister(
  username: string,
  password: string,
  passcode: string,
  email?: string,
) {
  return post('auth-register', { username, password, passcode, email: email || undefined })
}

export function authResetRequest(email: string) {
  return post('auth-reset-request', { email })
}

export function authResetConfirm(token: string, password: string) {
  return post('auth-reset-confirm', { token, password })
}

export function profileSave(profile: object) {
  return post('profile-save', { profile })
}

export function feedbackSubmit(payload: object) {
  return post('feedback-submit', payload)
}

export function crowdVerify(bill_id: number, iter_hash: string) {
  return post('crowd-verify', { bill_id, iter_hash })
}

export function crowdFlag(bill_id: number, iter_hash: string, action: 'flag' | 'unflag' | 'clear') {
  return post('crowd-flag', { bill_id, iter_hash, action })
}

export function adminBillSave(
  bill_id: number,
  fields: Record<string, unknown>,
  options?: { verify?: boolean; unverify?: boolean },
) {
  return post('admin-bill-save', { bill_id, fields, ...options })
}
