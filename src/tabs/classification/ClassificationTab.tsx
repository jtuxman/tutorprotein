import { useMemo, useState } from 'react'
import { AMINO_ACIDS, GROUPS, GROUP_ORDER, findAminoAcid, type AminoAcid } from '../../data/aminoacids'
import { AminoAcidCard } from './AminoAcidCard'
import { AminoAcidDetail } from './AminoAcidDetail'
import { FilterBar } from './FilterBar'
import { EMPTY_FILTERS, applyFilters, type Filters } from './filters'
import './classification.css'

type View = { kind: 'list' } | { kind: 'detail'; code: string }

export function ClassificationTab() {
  const [view, setView] = useState<View>({ kind: 'list' })
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const visible = useMemo(() => applyFilters(AMINO_ACIDS, filters), [filters])

  const open = (aminoAcid: AminoAcid) => {
    setView({ kind: 'detail', code: aminoAcid.code3 })
    window.scrollTo?.({ top: 0 })
  }

  if (view.kind === 'detail') {
    const aminoAcid = findAminoAcid(view.code)
    if (aminoAcid) {
      return <AminoAcidDetail aminoAcid={aminoAcid} onBack={() => setView({ kind: 'list' })} onNavigate={open} />
    }
  }

  return (
    <div className="classification">
      <header className="classification__intro">
        <h2>Los 20 aminoácidos</h2>
        <p>
          Agrupados según la química de su cadena lateral (clasificación de Lehninger). Toca una tarjeta para ver su
          ficha con estructura 2D, modelo 3D y propiedades.
        </p>
      </header>

      <FilterBar filters={filters} onChange={setFilters} resultCount={visible.length} />

      {visible.length === 0 && (
        <p className="classification__empty">
          <span aria-hidden="true">🧐</span> Ningún aminoácido cumple todo eso a la vez. Prueba a quitar algún filtro.
        </p>
      )}

      {GROUP_ORDER.map((group) => {
        const members = visible.filter((aa) => aa.group === group)
        if (members.length === 0) return null
        const info = GROUPS[group]
        return (
          <section
            key={group}
            className="group-section"
            aria-labelledby={`group-${group}`}
            style={{ '--group-color': `var(${info.cssVar})` } as React.CSSProperties}
          >
            <header className="group-section__header">
              <h3 id={`group-${group}`}>
                {info.label} <span className="group-section__count">{members.length}</span>
              </h3>
              <p>{info.description}</p>
            </header>
            <ul className="aa-grid">
              {members.map((aminoAcid) => (
                <AminoAcidCard key={aminoAcid.code3} aminoAcid={aminoAcid} onOpen={open} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
