/**
 * auth-signin — sign in with passcode (recognized device) or password (new/expired).
 *
 * POST { username: string, credential: string, mode: 'passcode' | 'password', remember?: boolean }
 *
 * Success: { ok: true, role: string, tier: number }
 *          + Set-Cookie: wsp_session=<token>; HttpOnly; Secure; SameSite=Strict
 *            (persistent 45-day cookie if remember=true, session cookie if remember=false)
 * Failure: { ok: false, error: string, locked?: boolean, attempts_remaining?: number }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  CORS, json, verifyCredential, newSessionToken, sessionExpiry,
  MAX_PASSCODE_ATTEMPTS, makeSessionCookie, makeSessionCookieShort,
} from '../_shared/auth-utils.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const body = await req.json().catch(() => null)
  if (!body?.username || !body?.credential || !body?.mode) {
    return json({ ok: false, error: 'username, credential, and mode are required' }, 400)
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .select('id, passcode_hash, password_hash, role, tier, failed_passcode_attempts, passcode_locked, district_info')
    .eq('username', body.username)
    .maybeSingle()

  if (error || !account) return json({ ok: false, error: 'invalid credentials' }, 401)

  if (body.mode === 'passcode') {
    if (account.passcode_locked) {
      return json({ ok: false, error: 'locked', locked: true }, 403)
    }
    if (!account.passcode_hash) {
      return json({ ok: false, error: 'no passcode set — use password' }, 400)
    }

    const valid = await verifyCredential(body.credential, account.passcode_hash)
    if (!valid) {
      const attempts = (account.failed_passcode_attempts ?? 0) + 1
      const locked = attempts >= MAX_PASSCODE_ATTEMPTS
      await supabase
        .from('accounts')
        .update({ failed_passcode_attempts: attempts, passcode_locked: locked })
        .eq('id', account.id)
      if (locked) return json({ ok: false, error: 'locked', locked: true }, 403)
      return json({
        ok: false,
        error: 'invalid credentials',
        attempts_remaining: MAX_PASSCODE_ATTEMPTS - attempts,
      }, 401)
    }

  } else {
    if (!account.password_hash) {
      return json({ ok: false, error: 'no password set' }, 400)
    }
    const valid = await verifyCredential(body.credential, account.password_hash)
    if (!valid) return json({ ok: false, error: 'invalid credentials' }, 401)

    await supabase
      .from('accounts')
      .update({ failed_passcode_attempts: 0, passcode_locked: false })
      .eq('id', account.id)
  }

  // Issue new session token and store expiry in DB
  const token   = newSessionToken()
  const expires = sessionExpiry()
  await supabase
    .from('accounts')
    .update({ session_token: token, session_expires_at: expires })
    .eq('id', account.id)

  // Set httpOnly cookie — persistent (45 days) or session-only based on remember flag
  const remember = body.remember !== false  // default true
  const cookie   = remember ? makeSessionCookie(token) : makeSessionCookieShort(token)

  return new Response(
    JSON.stringify({ ok: true, role: account.role, tier: account.tier, district_info: account.district_info ?? null }),
    {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Set-Cookie': cookie },
    },
  )
})
