/**
 * Adapter registry. To add a state's official source:
 *   1. Create adapters/<code>.ts exporting a StateAdapter (copy ny.ts)
 *   2. Import it here and add it to ADAPTERS
 *   3. In SQL: update state_sources set adapter = '<id>' where state = 'XX';
 * See docs/STATE_INGEST.md.
 */

import type { StateAdapter } from '../lib/types.ts'
import { legiscan } from './legiscan.ts'
import { ny } from './ny.ts'

export const ADAPTERS: Record<string, StateAdapter> = {
  [legiscan.id]: legiscan,
  [ny.id]: ny,
}
