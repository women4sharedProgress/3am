import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, resolveSession, CORS } from '../_shared/auth-utils.ts'

async function hashOtp(otp: string, accountId: string): Promise<string> {
  const data = new TextEncoder().encode(`${otp}:${accountId}`)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const session = await resolveSession(req, supabase)
  if (!session) return json({ ok: false, error: 'Not signed in' }, 401)

  let body: { type?: string; otp?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const { type, otp } = body
  if (type !== 'email' && type !== 'phone') {
    return json({ ok: false, error: 'type must be email or phone' }, 400)
  }
  if (!otp?.trim()) return json({ ok: false, error: 'otp is required' }, 400)

  const otpHash = await hashOtp(otp.trim(), session.id)

  const { data: row } = await supabase
    .from('verification_otps')
    .select('id, expires_at, used')
    .eq('account_id', session.id)
    .eq('type', type)
    .eq('otp_hash', otpHash)
    .eq('used', false)
    .maybeSingle()

  if (!row) return json({ ok: false, error: 'Invalid or expired code' }, 400)
  if (new Date(row.expires_at) <= new Date()) {
    return json({ ok: false, error: 'Code has expired' }, 400)
  }

  // Mark OTP used
  await supabase.from('verification_otps').update({ used: true }).eq('id', row.id)

  // Mark account phone/email verified
  const verifiedField = type === 'email' ? 'email_verified' : 'phone_verified'
  await supabase.from('accounts').update({ [verifiedField]: true }).eq('id', session.id)

  // Auto-upgrade to tier 4 if any one verification is complete (phone, email, or library card)
  const { data: acct } = await supabase
    .from('accounts')
    .select('phone_verified, email_verified, library_card, tier')
    .eq('id', session.id)
    .single()

  let tier_upgraded = false
  let new_tier      = acct?.tier ?? session.tier

  const anyVerified = acct && (
    acct.phone_verified ||
    acct.email_verified ||
    (acct.library_card && acct.library_card.trim())
  )
  if (anyVerified && acct.tier < 4) {
    await supabase.from('accounts').update({ tier: 4 }).eq('id', session.id)
    tier_upgraded = true
    new_tier      = 4
  }

  return json({ ok: true, tier_upgraded, new_tier })
})
