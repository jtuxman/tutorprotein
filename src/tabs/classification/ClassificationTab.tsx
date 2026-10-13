import { useMemo, useState } from 'react'
import { AMINO_ACIDS, GROUPS, GROUP_ORDER, findAminoAcid, type AminoAcid } from '../../data/aminoacids'
import { AminoAcidCard } from './AminoAcidCard'
import { AminoAcidDetail } from './AminoAcidDetail'
import { CompareView } from './CompareView'
import { FilterBar } from './FilterBar'
import { EMPTY_FILTERS, applyFilters, toggle, type Filters } from './filters'
import './classification.css'

type View = { kind: 'list' } | { kind: 'detail'; code: string } | { kind: 'compare'; first: string; second: string }

export function ClassificationTab() {
  const [view, setView] = useState<View>({ kind: 'list' })
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const visible = useMemo(() => applyFilters(AMINO_ACIDS, filters), [filters])

  // Códigos de las tarjetas marcadas para comparar (como máximo dos).
  const [selection, setSelection] = useState<string[]>([])
  const selected = selection.map((code) => findAminoAcid(code)).filter((aa) => aa !== undefined)

  const show = (next: View) => {
    setView(next)
    window.scrollTo?.({ top: 0 })
  }
  const open = (aminoAcid: AminoAcid) => show({ kind: 'detail', code: aminoAcid.code3 })
  const compare = (first: AminoAcid, second: AminoAcid) =>
    show({ kind: 'compare', first: first.code3, second: second.code3 })
  const backToList = () => {
    setSelection([])
    show({ kind: 'list' })
  }
  const toggleSelected = (aminoAcid: AminoAcid) =>
    // Con dos ya elegidas, una tercera sustituye a la más antigua.
    setSelection((codes) => toggle(codes, aminoAcid.code3).slice(-2))

  if (view.kind === 'detail') {
    const aminoAcid = findAminoAcid(view.code)
    if (aminoAcid) {
      return <AminoAcidDetail aminoAcid={aminoAcid} onBack={backToList} onNavigate={open} onCompare={compare} />
    }
  }

  if (view.kind === 'compare') {
    const first = findAminoAcid(view.first)
    const second = findAminoAcid(view.second)
    if (first && second) {
      return <CompareView first={first} second={second} onChange={compare} onBack={backToList} onOpen={open} />
    }
  }

  return (
    <div className="classification">
      <header className="classification__intro">
        <h2>Los 20 aminoácidos</h2>
        <p>
          Agrupados según la química de su cadena lateral (clasificación de Lehninger). Toca una tarjeta para ver su
          ficha con estructura 2D, modelo 3D y propiedades, o marca dos con ⚖️ para compararlas lado a lado.
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
                <AminoAcidCard
                  key={aminoAcid.code3}
                  aminoAcid={aminoAcid}
                  onOpen={open}
                  selected={selection.includes(aminoAcid.code3)}
                  onToggleSelected={toggleSelected}
                />
              ))}
            </ul>
            <details className="group-section__why">
              <summary>¿Por qué se llaman así?</summary>
              {info.explanation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </details>
          </section>
        )
      })}

      {selected.length > 0 && (
        <div className="compare-bar" role="region" aria-label="Comparar">
          <span className="compare-bar__text">
            <span aria-hidden="true">⚖️</span>{' '}
            {selected.length === 2
              ? `${selected[0].name} y ${selected[1].name}`
              : `${selected[0].name} y… elige otro con ⚖️`}
          </span>
          <button
            type="button"
            className="pill-button pill-button--primary"
            disabled={selected.length < 2}
            onClick={() => compare(selected[0], selected[1])}
          >
            Comparar
          </button>
          <button type="button" className="pill-button" onClick={() => setSelection([])}>
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
