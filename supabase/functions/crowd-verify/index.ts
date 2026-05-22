import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveSession, CORS, json } from '../_shared/auth-utils.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const secretKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const COMMUNITY_THRESHOLD = 3

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(supabaseUrl, secretKey)
  const user = await resolveSession(req, supabase)
  if (!user) return json({ ok: false, error: 'Not authenticated' }, 401)

  let body: { bill_id?: number; iter_hash?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const { bill_id, iter_hash } = body
  if (!bill_id || !iter_hash || typeof iter_hash !== 'string' || iter_hash.length > 32) {
    return json({ ok: false, error: 'Missing or invalid fields' }, 400)
  }

  // Insert verification; silently ignore if this account already verified this iteration
  await supabase.from('bill_crowd_verifications').upsert(
    { bill_id, account_id: user.id, iter_hash },
    { onConflict: 'bill_id,account_id,iter_hash', ignoreDuplicates: true },
  )

  // Count total distinct verifications for this bill + iteration
  const { count } = await supabase
    .from('bill_crowd_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('bill_id', bill_id)
    .eq('iter_hash', iter_hash)

  const verifyCount = count ?? 0
  const crowdVerified = verifyCount >= COMMUNITY_THRESHOLD

  // Once community threshold is reached, record it on the bill row.
  // This is the "crowd_verified_hash" used to detect subsequent changes.
  if (crowdVerified) {
    await supabase.from('bills').update({ crowd_verified_hash: iter_hash }).eq('id', bill_id)
  }

  return json({ ok: true, count: verifyCount, crowd_verified: crowdVerified })
})
