# State Ingestion — How It Works

## The short version
Every night between 2 and 6 AM Eastern, the `state-refresh` function pulls bill data for every state that is switched on. Each state gets its data from one **source**: either the state's own website/API, or LegiScan as a backup.

The `state_sources` table controls everything. To change what runs, edit that table. No code changes are needed.

## Is it working? (run in Supabase SQL)
```sql
select state, adapter, active, last_status, last_run_at, last_error
from state_sources where active order by last_status desc, state;
```
- `last_status = ok` means it's fine.
- `last_status = error` means read `last_error`. The usual causes are a state redesigning its website or an expired API key.
- A `last_run_at` older than 2 days means the nightly job isn't running. Check `select * from cron.job;`

## Turn a state on or off
```sql
update state_sources set active = true  where state = 'OH';
update state_sources set active = false where state = 'OH';
```

## A state's own source broke — quick fix
Switch it back to LegiScan until someone fixes the adapter:
```sql
update state_sources set adapter = 'legiscan' where state = 'NY';
```
Bills already in the system are matched by bill number, so switching sources never creates duplicates.

## Test a state without writing anything
Send this to the function (with the service role key as `Authorization: Bearer ...`):
```json
{ "states": ["NY"], "dryRun": true }
```
You get back how many bills were fetched, plus 5 sample bills.

## Rules the pipeline always follows
- It only writes Layer 1 fields (name, introduced, stage, stage dates, stage note, committee).
- It never touches human-written fields.
- On verified cards, changes go to `pending_changes` for review and never onto the live card.
- It never deletes bills.
- New bills are only added if their title matches the keyword rules, with a maximum of 20 new bills per state per night.

## Files
| File | What it is |
|---|---|
| `supabase/functions/state-refresh/index.ts` | Nightly runner (picks states, logs results) |
| `.../lib/store.ts` | Writes to `bills` (verified-card rules live here) |
| `.../lib/normalize.ts` | Shared helpers and keyword rules |
| `.../lib/xml.ts` | Shared XML reader (used by WA and other XML states) |
| `.../lib/sources.ts` | Master list of all 50 state sources and build status |
| `.../adapters/legiscan.ts` | LegiScan backup source |
| `.../adapters/<state>.ts` | One file per state's own source |
| `.../adapters/index.ts` | List of available adapters |
| `supabase/migrations/025_state_sources.sql` | Control table and nightly schedule |
| `supabase/migrations/026_wa_source.sql` | Points WA at its official source (off until dry run) |

## States on their own official source
| State | Adapter | Key needed |
|---|---|---|
| NY | `ny` | `NY_OPENLEG_API_KEY` |
| WA | `wa` | none |

All other states use `legiscan` until their adapter is built.

## Secrets
`LEGISCAN_API_KEY`, `NY_OPENLEG_API_KEY`, and optionally `STATE_BATCH_SIZE` (default 3 states per call).
