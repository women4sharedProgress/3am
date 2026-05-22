import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolveSession, CORS, json } from '../_shared/auth-utils.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const secretKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const FLAG_THRESHOLD = 3

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(supabaseUrl, secretKey)
  const user = await resolveSession(req, supabase)
  if (!user) return json({ ok: false, error: 'Not authenticated' }, 401)

  let body: { bill_id?: number; iter_hash?: string; action?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'Invalid JSON' }, 400) }

  const { bill_id, iter_hash, action } = body
  if (!bill_id || !iter_hash || typeof iter_hash !== 'string' || iter_hash.length > 32) {
    return json({ ok: false, error: 'Missing or invalid fields' }, 400)
  }

  // Admin clear: removes all flags for this bill+iteration
  if (action === 'clear') {
    if (user.role !== 'admin' && user.role !== 'verifier') {
      return json({ ok: false, error: 'Insufficient role' }, 403)
    }
    await supabase.from('bill_crowd_flags').delete()
      .eq('bill_id', bill_id).eq('iter_hash', iter_hash)
    return json({ ok: true, count: 0, user_flagged: false })
  }

  // Toggle flag for this user
  if (action === 'unflag') {
    await supabase.from('bill_crowd_flags').delete()
      .eq('bill_id', bill_id).eq('account_id', user.id).eq('iter_hash', iter_hash)
  } else {
    // Default action: flag
    await supabase.from('bill_crowd_flags').upsert(
      { bill_id, account_id: user.id, iter_hash },
      { onConflict: 'bill_id,account_id,iter_hash', ignoreDuplicates: true },
    )
  }

  const { count } = await supabase
    .from('bill_crowd_flags')
    .select('id', { count: 'exact', head: true })
    .eq('bill_id', bill_id)
    .eq('iter_hash', iter_hash)

  const flagCount = count ?? 0

  // Check if user still has a flag after this action
  const { data: ownFlag } = await supabase
    .from('bill_crowd_flags')
    .select('id')
    .eq('bill_id', bill_id)
    .eq('account_id', user.id)
    .eq('iter_hash', iter_hash)
    .maybeSingle()

  return json({
    ok: true,
    count: flagCount,
    user_flagged: ownFlag !== null,
    community_flagged: flagCount >= FLAG_THRESHOLD,
  })
})
