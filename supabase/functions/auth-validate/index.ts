/**
 * auth-validate — validate an existing session and roll the 45-day window.
 * Call on every page load. No request body needed — reads wsp_session cookie.
 *
 * POST (empty body)
 *
 * Success: { ok: true, username: string, role: string, tier: number }
 *          + Set-Cookie refreshes the 45-day window
 * Failure: { ok: false, reason?: 'expired' | 'no_cookie' }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS, json, sessionExpiry, getCookie, makeSessionCookie, SESSION_COOKIE } from '../_shared/auth-utils.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const token = getCookie(req, SESSION_COOKIE)
  if (!token) return json({ ok: false, reason: 'no_cookie' }, 401)

  const { data: account, error } = await supabase
    .from('accounts')
    .select('id, username, session_token, session_expires_at, role, tier, district_info')
    .eq('session_token', token)
    .maybeSingle()

  if (error || !account) return json({ ok: false }, 401)
  if (account.session_token !== token) return json({ ok: false }, 401)
  if (!account.session_expires_at || new Date(account.session_expires_at) <= new Date()) {
    return json({ ok: false, reason: 'expired' }, 401)
  }

  // Roll the session window forward by 45 days from now
  await supabase
    .from('accounts')
    .update({ session_expires_at: sessionExpiry() })
    .eq('id', account.id)

  return new Response(
    JSON.stringify({ ok: true, username: account.username, role: account.role, tier: account.tier, district_info: account.district_info ?? null }),
    {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'Set-Cookie':    makeSessionCookie(token),  // refresh cookie expiry in browser
      },
    },
  )
})
