import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, resolveSession, CORS } from '../_shared/auth-utils.ts'

function generateOtp(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(3))
  const n = (bytes[0] << 16 | bytes[1] << 8 | bytes[2]) % 1_000_000
  return String(n).padStart(6, '0')
}

async function hashOtp(otp: string, accountId: string): Promise<string> {
  const data = new TextEncoder().encode(`${otp}:${accountId}`)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sendEmail(to: string, otp: string): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) {
    console.log(`[verify-send] EMAIL OTP for ${to}: ${otp}`)
    return true
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from:    'W4SP <no-reply@3ampipeline.org>',
      to:      [to],
      subject: 'Your W4SP verification code',
      text:    `Your verification code is: ${otp}\n\nThis code expires in 15 minutes.`,
    }),
  })
  return res.ok
}

async function sendSms(to: string, otp: string): Promise<boolean> {
  const sid   = Deno.env.get('TWILIO_ACCOUNT_SID')
  const token = Deno.env.get('TWILIO_AUTH_TOKEN')
  const from  = Deno.env.get('TWILIO_PHONE_NUMBER')
  if (!sid || !token || !from) {
    console.log(`[verify-send] SMS OTP for ${to}: ${otp}`)
    return true
  }
  const body = new URLSearchParams({ To: to, From: from, Body: `Your W4SP code: ${otp}` })
  const res  = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })
  return res.ok
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const session = await resolveSession(req, supabase)
  if (!session) return json({ ok: false, error: 'Not signed in' }, 401)

  let body: { type?: string; target?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const { type, target } = body
  if (type !== 'email' && type !== 'phone') {
    return json({ ok: false, error: 'type must be email or phone' }, 400)
  }
  if (!target?.trim()) return json({ ok: false, error: 'target is required' }, 400)

  const otp     = generateOtp()
  const otpHash = await hashOtp(otp, session.id)
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  // Invalidate any previous unused OTPs for this account+type
  await supabase
    .from('verification_otps')
    .update({ used: true })
    .eq('account_id', session.id)
    .eq('type', type)
    .eq('used', false)

  const { error: insertError } = await supabase.from('verification_otps').insert({
    account_id: session.id,
    type,
    otp_hash:   otpHash,
    target:     target.trim(),
    expires_at: expires,
    used:       false,
  })
  if (insertError) return json({ ok: false, error: insertError.message }, 500)

  let sent = false
  if (type === 'email') {
    sent = await sendEmail(target.trim(), otp)
  } else {
    sent = await sendSms(target.trim(), otp)
  }

  if (!sent) return json({ ok: false, error: 'Failed to send verification message' }, 500)
  return json({ ok: true })
})
