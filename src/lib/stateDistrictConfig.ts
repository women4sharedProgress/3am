// Per-state configuration for the District Information section.
// Michigan is fully configured. All other states are stubbed with correct
// houseName, countyLabel, and showVillage; court fields default to false
// until those states are onboarded.

export interface StateDistrictConfig {
  houseName:         string  // label for the state house-chamber district field
  countyLabel:       string  // "County" | "Parish" | "Borough"
  unicameral:        boolean // single legislative chamber — hides senate/house split
  showVillage:       boolean
  showCircuitCourt:  boolean
  showProbateCourt:  boolean
  showDistrictCourt: boolean
}

const D: StateDistrictConfig = {
  houseName:         'House',
  countyLabel:       'County',
  unicameral:        false,
  showVillage:       false,
  showCircuitCourt:  false,
  showProbateCourt:  false,
  showDistrictCourt: false,
}

// Shorthand for states with village/township governance
const V: Partial<StateDistrictConfig> = { showVillage: true }

export const STATE_DISTRICT_CONFIGS: Record<string, StateDistrictConfig> = {
  AL: D,
  AK: { ...D, countyLabel: 'Borough' },
  AZ: D,
  AR: D,
  CA: { ...D, houseName: 'Assembly' },
  CO: D,
  CT: { ...D, ...V },
  DE: D,
  FL: D,
  GA: D,
  HI: D,
  ID: D,
  IL: { ...D, ...V },
  IN: { ...D, ...V },
  IA: { ...D, ...V },
  KS: D,
  KY: D,
  LA: { ...D, countyLabel: 'Parish' },
  ME: { ...D, ...V },
  MD: { ...D, houseName: 'Delegates' },
  MA: { ...D, ...V },
  MI: {
    houseName:         'House',
    countyLabel:       'County',
    unicameral:        false,
    showVillage:       true,
    showCircuitCourt:  true,
    showProbateCourt:  true,
    showDistrictCourt: true,
  },
  MN: { ...D, ...V },
  MS: D,
  MO: D,
  MT: D,
  NE: { ...D, houseName: 'Legislature', unicameral: true, ...V },
  NV: { ...D, houseName: 'Assembly' },
  NH: { ...D, ...V },
  NJ: { ...D, houseName: 'Assembly', ...V },
  NM: D,
  NY: { ...D, houseName: 'Assembly', ...V },
  NC: D,
  ND: { ...D, ...V },
  OH: { ...D, ...V },
  OK: D,
  OR: D,
  PA: { ...D, ...V },
  RI: { ...D, ...V },
  SC: D,
  SD: { ...D, ...V },
  TN: D,
  TX: D,
  UT: D,
  VT: { ...D, ...V },
  VA: { ...D, houseName: 'Delegates' },
  WA: D,
  WV: { ...D, houseName: 'Delegates' },
  WI: { ...D, houseName: 'Assembly', ...V },
  WY: D,
  DC: { ...D, houseName: 'Council', countyLabel: 'District', unicameral: true },
}

export function getStateConfig(state: string): StateDistrictConfig {
  return STATE_DISTRICT_CONFIGS[state] ?? D
}
