export const FEDERAL_STAGES  = ['Introduced', 'Committee', 'House floor', 'Senate', 'Conference', 'Signed']
export const MICHIGAN_STAGES = ['Introduced', 'Committee', 'First chamber', 'Second chamber', 'Governor']
export const LOCAL_STAGES    = ['Introduced', 'Committee', 'Public Hearing', 'Vote', 'Mayor / Exec']

export const OFFICE_META: Record<string, { label: string; dotCls: string }> = {
  'governor':     { label: 'With Governor',          dotCls: 'od-gov'    },
  'mi-senate':    { label: 'Michigan Senate',        dotCls: 'od-mis'    },
  'mi-house':     { label: 'Michigan House',         dotCls: 'od-mih'    },
  'ks-senate':    { label: 'Kansas Senate',          dotCls: 'od-mis'    },
  'ks-house':     { label: 'Kansas House',           dotCls: 'od-mih'    },
  'committee':    { label: 'In Committee',           dotCls: 'od-com'    },
  'us-senate':    { label: 'U.S. Senate',            dotCls: 'od-uss'    },
  'president':    { label: 'President',              dotCls: 'od-pres'   },
  'mayor':        { label: 'With Mayor / Exec',      dotCls: 'od-mayor'  },
  'city-council': { label: 'City Council',           dotCls: 'od-council'},
  'county-board': { label: 'County Board',           dotCls: 'od-county' },
}

export const ISSUE_LABELS: Record<string, string> = {
  surveillance: 'Surveillance & privacy',
  voting:       'Voting rights',
  immigration:  'Immigration',
  technology:   'Technology & AI',
  policing:     'Policing & justice',
  speech:       'Press & speech',
  education:    'Education',
  environment:  'Environment',
  labor:        'Labor & wages',
  healthcare:   'Healthcare',
  housing:      'Housing',
}

export const CITY_FILTERS = [
  'Detroit', 'Ann Arbor', 'Grand Rapids', 'Lansing',
  'Flint', 'Kalamazoo', 'Kent County',
  'Wichita', 'Kansas City', 'Topeka', 'Overland Park',
  'Lawrence', 'Olathe', 'Johnson County',
]

export const STATE_NAMES: Record<string, string> = {
  MI: 'Michigan',
  KS: 'Kansas',
}
