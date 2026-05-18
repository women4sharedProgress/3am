// In dev, VITE_FUNCTIONS_BASE='' routes through the Vite proxy (/functions/v1 → Supabase).
// In production, VITE_FUNCTIONS_BASE=https://yourproject.supabase.co (or custom domain).
const BASE = (import.meta.env.VITE_FUNCTIONS_BASE ?? import.meta.env.VITE_SUPABASE_URL) + '/functions/v1'

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
