import type { ChargeSign } from '../../chem/charge'
import {
  ESSENTIALITY_LABELS,
  GROUPS,
  GROUP_ORDER,
  type Essentiality,
  type LehningerGroup,
} from '../../data/aminoacids'
import { CHARGE_LABELS, EMPTY_FILTERS, hasActiveFilters, toggle, type Filters } from './filters'

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  resultCount: number
}

interface ChipProps {
  active: boolean
  onClick: () => void
  color?: string
  children: React.ReactNode
}

function Chip({ active, onClick, color, children }: ChipProps) {
  return (
    <button
      type="button"
      className="filter-chip"
      aria-pressed={active}
      style={color ? ({ '--chip-color': color } as React.CSSProperties) : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const CHARGES: ChargeSign[] = ['positive', 'negative', 'neutral']
const ESSENTIALITIES: Essentiality[] = ['essential', 'conditional', 'nonessential']

export function FilterBar({ filters, onChange, resultCount }: FilterBarProps) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <section className="filter-bar" aria-label="Buscar y filtrar">
      <label className="filter-bar__search">
        <span aria-hidden="true">🔎</span>
        <span className="visually-hidden">Buscar aminoácido</span>
        <input
          type="search"
          placeholder="Busca por nombre o código: glutámico, Trp, W…"
          value={filters.query}
          onChange={(event) => set({ query: event.target.value })}
        />
      </label>

      <div className="filter-bar__group" role="group" aria-label="Grupo">
        <span className="filter-bar__title">Grupo</span>
        {GROUP_ORDER.map((group: LehningerGroup) => (
          <Chip
            key={group}
            active={filters.groups.includes(group)}
            color={`var(${GROUPS[group].cssVar})`}
            onClick={() => set({ groups: toggle(filters.groups, group) })}
          >
            {GROUPS[group].label}
          </Chip>
        ))}
      </div>

      <div className="filter-bar__group" role="group" aria-label="Carga a pH 7">
        <span className="filter-bar__title">Carga a pH 7</span>
        {CHARGES.map((charge) => (
          <Chip
            key={charge}
            active={filters.charges.includes(charge)}
            onClick={() => set({ charges: toggle(filters.charges, charge) })}
          >
            {CHARGE_LABELS[charge]}
          </Chip>
        ))}
      </div>

      <div className="filter-bar__group" role="group" aria-label="Esencialidad">
        <span className="filter-bar__title">Esencialidad</span>
        {ESSENTIALITIES.map((value) => (
          <Chip
            key={value}
            active={filters.essentiality.includes(value)}
            onClick={() => set({ essentiality: toggle(filters.essentiality, value) })}
          >
            {ESSENTIALITY_LABELS[value]}
          </Chip>
        ))}
      </div>

      <div className="filter-bar__group" role="group" aria-label="Composición">
        <span className="filter-bar__title">Composición</span>
        <Chip active={filters.sulfur} onClick={() => set({ sulfur: !filters.sulfur })}>
          Con azufre
        </Chip>
      </div>

      <p className="filter-bar__summary" role="status">
        {resultCount === 20 ? 'Los 20 aminoácidos' : `${resultCount} de 20 aminoácidos`}
        {hasActiveFilters(filters) && (
          <button type="button" className="link-button" onClick={() => onChange(EMPTY_FILTERS)}>
            Quitar filtros
          </button>
        )}
      </p>
    </section>
  )
}
