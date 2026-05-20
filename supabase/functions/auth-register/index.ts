/**
 * auth-register — public self-registration.
 *
 * POST { username: string, password: string, passcode: string, email?: string }
 *
 * Always creates tier = 2, role = 'user'. Caller cannot set role or tier.
 * Rate limited: 3 attempts per IP per hour.
 *
 * Success: { ok: true,  id: string }
 * Failure: { ok: false, error: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS, json, hashCredential } from '../_shared/auth-utils.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const MAX_ATTEMPTS  = 3
const WINDOW_MS     = 60 * 60 * 1000   // 1 hour

async function sha256Hex(text: string): Promise<string> {
  const bits = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function checkRateLimit(ipHash: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString()

  // Delete rows older than 2 hours — keeps no IP hash data beyond what rate limiting requires
  const twoHoursAgo = new Date(Date.now() - 2 * WINDOW_MS).toISOString()
  await supabase
    .from('registration_rate_limits')
    .delete()
    .lt('window_start', twoHoursAgo)

  const { data: record } = await supabase
    .from('registration_rate_limits')
    .select('attempts, window_start')
    .eq('ip_hash', ipHash)
    .maybeSingle()

  if (record && new Date(record.window_start) >= new Date(windowStart)) {
    // Active window exists
    if (record.attempts >= MAX_ATTEMPTS) {
      const windowEnds = new Date(record.window_start).getTime() + WINDOW_MS
      return { allowed: false, retryAfter: Math.ceil((windowEnds - Date.now()) / 1000) }
    }
    await supabase
      .from('registration_rate_limits')
      .update({ attempts: record.attempts + 1 })
      .eq('ip_hash', ipHash)
  } else {
    // No record or expired — start a fresh window
    await supabase
      .from('registration_rate_limits')
      .upsert({ ip_hash: ipHash, attempts: 1, window_start: new Date().toISOString() })
  }

  return { allowed: true }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Rate limit by IP
  const rawIp  = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
               ?? req.headers.get('x-real-ip')
               ?? 'unknown'
  const ipHash = await sha256Hex(rawIp)
  const rate   = await checkRateLimit(ipHash)

  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ ok: false, error: 'too many registration attempts', retry_after_seconds: rate.retryAfter }),
      {
        status: 429,
        headers: {
          ...CORS,
          'Content-Type': 'application/json',
          'Retry-After': String(rate.retryAfter ?? 3600),
        },
      }
    )
  }

  const body = await req.json().catch(() => null)
  if (!body?.username || !body?.password || !body?.passcode) {
    return json({ ok: false, error: 'username, password, and passcode are required' }, 400)
  }

  // Validate username format — alphanumeric + underscore/hyphen, 3-32 chars
  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(body.username)) {
    return json({ ok: false, error: 'username must be 3-32 characters: letters, numbers, _ or -' }, 400)
  }

  // Explicit uniqueness checks so callers get a clear field-level error
  const { data: existing } = await supabase
    .from('accounts')
    .select('username, email')
    .or(`username.eq.${body.username}${body.email ? `,email.eq.${body.email}` : ''}`)
    .limit(1)
    .maybeSingle()

  if (existing) {
    if (existing.username === body.username) {
      return json({ ok: false, error: 'username already taken' }, 409)
    }
    return json({ ok: false, error: 'email already registered' }, 409)
  }

  const password_hash = await hashCredential(body.password)
  const passcode_hash = await hashCredential(body.passcode)

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      username:     body.username,
      password_hash,
      passcode_hash,
      email:        body.email ?? null,
      role:         'user',   // hardcoded — caller cannot set
      tier:         2,        // hardcoded — caller cannot set; tier 1 = no account
    })
    .select('id')
    .single()

  if (error) {
    // Catch any race-condition duplicate that slipped past the explicit check
    if (error.code === '23505') {
      return json({ ok: false, error: 'username or email already exists' }, 409)
    }
    return json({ ok: false, error: 'registration failed' }, 500)
  }

  return json({ ok: true, id: data.id }, 201)
})
