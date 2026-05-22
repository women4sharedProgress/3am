export interface Decision {
  label: string
  text: string
}

export type BillLevel = 'federal' | 'michigan' | 'local'
export type Urgency = 'urgent' | 'months' | 'year' | 'stalled'

export interface Bill {
  id: number
  state: string
  level: BillLevel
  municipality: string | null
  amend: string[]
  urgency: Urgency
  policy_bias: number
  issues: string[]
  ratify_office: string
  stage_dates: (string | null)[]
  stage: number
  stage_note: string
  name: string
  bill_desc: string
  introduced: string
  supporters: string
  blockers: string
  influence_window: string
  decisions: Decision[]
  created_at: string
  updated_at: string
  crowd_verified_hash?: string | null
  verified?: boolean
  verified_by?: string | null
  verified_at?: string | null
  extension?: string | null
}

export interface ActiveFilters {
  level: string
  timing: string
  impact: string
  issue: string
  policy: string
  office: string
  city: string
  search: string
}
