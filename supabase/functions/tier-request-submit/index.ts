import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { json, resolveSession, CORS } from '../_shared/auth-utils.ts'

const VALID_TYPES = [
  'verification_volunteer',
  'broadcast_verifier',
  'elected_official_local',
  'elected_official_state',
  'elected_official_national',
  'verified_account_tier4',
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const session = await resolveSession(req, supabase)
  if (!session) return json({ ok: false, error: 'Not signed in' }, 401)

  let body: { request_type?: string; note?: string; contact_email?: string; contact_phone?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const { request_type, note, contact_email, contact_phone } = body
  if (!request_type || !VALID_TYPES.includes(request_type)) {
    return json({ ok: false, error: 'Invalid request type' }, 400)
  }
  if (!contact_email?.trim()) return json({ ok: false, error: 'Contact email is required' }, 400)
  if (!contact_phone?.trim()) return json({ ok: false, error: 'Contact phone is required' }, 400)

  // Enforce 50-word note limit server-side
  const words = (note ?? '').split(/\s+/).filter(Boolean)
  const trimmedNote = words.slice(0, 50).join(' ') || null

  // Prevent duplicate pending requests of the same type
  const { data: existing } = await supabase
    .from('tier_requests')
    .select('id')
    .eq('account_id', session.id)
    .eq('request_type', request_type)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return json({ ok: false, error: 'You already have a pending request of this type.' }, 409)
  }

  const { error } = await supabase.from('tier_requests').insert({
    account_id:    session.id,
    username:      session.username,
    request_type,
    note:          trimmedNote,
    contact_email: contact_email.trim(),
    contact_phone: contact_phone.trim(),
    status:        'pending',
  })

  if (error) return json({ ok: false, error: error.message }, 500)
  return json({ ok: true })
})
