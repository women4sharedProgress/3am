import type { ActiveFilters } from '../types/bill'
import { ISSUE_LABELS, CITY_FILTERS } from '../lib/constants'

interface FilterGroupsProps {
  active: ActiveFilters
  onChange: (group: keyof ActiveFilters, value: string) => void
  hideTiming?: boolean
  committees?: string[]
}

function Chip({ group, value, active, label, children, onChange }: {
  group: keyof ActiveFilters
  value: string
  active: string
  label?: string
  children?: React.ReactNode
  onChange: (group: keyof ActiveFilters, value: string) => void
}) {
  return (
    <button
      className={'chip' + (active === value ? ' active' : '')}
      data-f={value}
      onClick={() => onChange(group, value)}
    >
      {children ?? label}
    </button>
  )
}

export default function FilterGroups({ active, onChange, hideTiming, committees }: FilterGroupsProps) {
  return (
    <div className="filter-groups">

      <div className="filter-group">
        <span className="fg-label">Level</span>
        <div className="chips">
          <Chip group="level" value="all"      active={active.level} onChange={onChange}>All</Chip>
          <Chip group="level" value="federal"  active={active.level} onChange={onChange}>🇺🇸 Federal</Chip>
          <Chip group="level" value="michigan" active={active.level} onChange={onChange}>Michigan</Chip>
          <Chip group="level" value="local"    active={active.level} onChange={onChange}>📍 Local</Chip>
        </div>
      </div>

      {active.level === 'local' && (
        <div className="filter-group filter-group-city">
          <span className="fg-label fg-indent">↳ City</span>
          <div className="chips">
            <Chip group="city" value="all" active={active.city} onChange={onChange}>All cities</Chip>
            {CITY_FILTERS.map(city => (
              <Chip key={city} group="city" value={city} active={active.city} onChange={onChange}>{city}</Chip>
            ))}
          </div>
        </div>
      )}

      {(active.level === 'federal' || active.level === 'michigan') && committees && committees.length > 0 && (
        <div className="filter-group filter-group-city">
          <span className="fg-label fg-indent">↳ Committee</span>
          <div className="chips">
            <Chip group="committee" value="all" active={active.committee} onChange={onChange}>All committees</Chip>
            {committees.map(c => (
              <Chip key={c} group="committee" value={c} active={active.committee} onChange={onChange}>{c}</Chip>
            ))}
          </div>
        </div>
      )}

      {!hideTiming && <div className="filter-group">
        <span className="fg-label">Timing</span>
        <div className="chips">
          <Chip group="timing" value="all"     active={active.timing} onChange={onChange}>All</Chip>
          <Chip group="timing" value="urgent"  active={active.timing} onChange={onChange}>Act now</Chip>
          <Chip group="timing" value="months"  active={active.timing} onChange={onChange}>Months</Chip>
          <Chip group="timing" value="session" active={active.timing} onChange={onChange}>Session</Chip>
          <Chip group="timing" value="stalled"  active={active.timing} onChange={onChange}>Stalled</Chip>
          <Chip group="timing" value="enacted" active={active.timing} onChange={onChange}>Recently enacted</Chip>
        </div>
      </div>}

      <div className="filter-group">
        <span className="fg-label">Constitutional impact</span>
        <div className="chips">
          <Chip group="impact" value="all" active={active.impact} onChange={onChange}>All</Chip>
          <Chip group="impact" value="4th" active={active.impact} onChange={onChange}>4th Amendment</Chip>
          <Chip group="impact" value="1st" active={active.impact} onChange={onChange}>1st Amendment</Chip>
          <Chip group="impact" value="due" active={active.impact} onChange={onChange}>Due process / 14th</Chip>
        </div>
      </div>

      <div className="filter-group">
        <span className="fg-label">Main issue</span>
        <div className="chips">
          <Chip group="issue" value="all" active={active.issue} onChange={onChange}>All</Chip>
          {Object.entries(ISSUE_LABELS).map(([val, label]) => (
            <Chip key={val} group="issue" value={val} active={active.issue} onChange={onChange}>{label}</Chip>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <span className="fg-label">Policy direction</span>
        <div className="chips">
          <Chip group="policy" value="all"          active={active.policy} onChange={onChange}>All</Chip>
          <Chip group="policy" value="liberal"      active={active.policy} onChange={onChange}>
            <span className="chip-dot" />Liberal
          </Chip>
          <Chip group="policy" value="center"       active={active.policy} onChange={onChange}>
            <span className="chip-dot" />Center / mixed
          </Chip>
          <Chip group="policy" value="conservative" active={active.policy} onChange={onChange}>
            <span className="chip-dot" />Conservative
          </Chip>
        </div>
      </div>

      <div className="filter-group">
        <span className="fg-label">Currently with</span>
        <div className="chips">
          <Chip group="office" value="all"          active={active.office} onChange={onChange}>All</Chip>
          <Chip group="office" value="us-senate"    active={active.office} onChange={onChange}><span className="chip-dot" />U.S. Senate</Chip>
          <Chip group="office" value="governor"     active={active.office} onChange={onChange}><span className="chip-dot" />Governor Whitmer</Chip>
          <Chip group="office" value="mi-senate"    active={active.office} onChange={onChange}><span className="chip-dot" />Michigan Senate</Chip>
          <Chip group="office" value="mi-house"     active={active.office} onChange={onChange}><span className="chip-dot" />Michigan House</Chip>
          <Chip group="office" value="committee"    active={active.office} onChange={onChange}><span className="chip-dot" />In Committee</Chip>
          <Chip group="office" value="mayor"        active={active.office} onChange={onChange}><span className="chip-dot" />With Mayor / Exec</Chip>
          <Chip group="office" value="city-council" active={active.office} onChange={onChange}><span className="chip-dot" />City Council</Chip>
          <Chip group="office" value="county-board" active={active.office} onChange={onChange}><span className="chip-dot" />County Board</Chip>
        </div>
      </div>

    </div>
  )
}
