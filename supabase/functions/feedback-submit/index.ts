import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS, json } from '../_shared/auth-utils.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const {
    timestamp, app_version, page_route, account_tier, user_role,
    theme, browser, os, screen_size, session_minutes,
    active_filters, bills_shown, feedback_text, username,
  } = payload

  if (!feedback_text || typeof feedback_text !== 'string' || !feedback_text.trim()) {
    return json({ error: 'feedback_text is required' }, 400)
  }

  const { error } = await supabase.from('feedback_submissions').insert({
    timestamp:       timestamp ?? new Date().toISOString(),
    app_version:     String(app_version ?? ''),
    page_route:      String(page_route ?? ''),
    account_tier:    Number(account_tier ?? 0),
    user_role:       String(user_role ?? 'none'),
    theme:           theme     != null ? String(theme)     : null,
    browser:         browser   != null ? String(browser)   : null,
    os:              os        != null ? String(os)        : null,
    screen_size:     screen_size != null ? String(screen_size) : null,
    session_minutes: session_minutes != null ? Number(session_minutes) : null,
    active_filters:  active_filters != null ? String(active_filters) : null,
    bills_shown:     bills_shown    != null ? Number(bills_shown)    : null,
    feedback_text:   String(feedback_text).slice(0, 1000),
    username:        username   != null ? String(username).slice(0, 64) : null,
  })

  if (error) return json({ error: error.message }, 500)
  return json({ ok: true })
})
