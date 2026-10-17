import { useMemo, useState } from 'react'
import { AMINO_ACIDS, GROUPS, GROUP_ORDER, findAminoAcid, type AminoAcid } from '../../data/aminoacids'
import { AminoAcidCard } from './AminoAcidCard'
import { AminoAcidDetail } from './AminoAcidDetail'
import { CompareView } from './CompareView'
import { FilterBar } from './FilterBar'
import { MutationSimulator } from './MutationSimulator'
import { PhSimulator } from './PhSimulator'
import { StructureBuilder } from './StructureBuilder'
import { StructureBuilder3D } from './StructureBuilder3D'
import { EMPTY_FILTERS, applyFilters, toggle, type Filters } from './filters'
import './classification.css'

type Section = 'catalog' | 'ph' | 'builder' | 'builder3d' | 'trio3d' | 'mutations'
type CatalogView =
  | { kind: 'list' }
  | { kind: 'detail'; code: string }
  | { kind: 'compare'; first: string; second: string }

export function ClassificationTab() {
  const [section, setSection] = useState<Section>('catalog')
  const [view, setView] = useState<CatalogView>({ kind: 'list' })
  const [toolAminoAcid, setToolAminoAcid] = useState<AminoAcid | undefined>(undefined)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const visible = useMemo(() => applyFilters(AMINO_ACIDS, filters), [filters])

  // Códigos de las tarjetas marcadas para comparar (como máximo dos).
  const [selection, setSelection] = useState<string[]>([])
  const selected = selection.map((code) => findAminoAcid(code)).filter((aa) => aa !== undefined)

  const show = (next: CatalogView) => {
    setSection('catalog')
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

  const openPhFor = (aminoAcid: AminoAcid) => {
    setToolAminoAcid(aminoAcid)
    setSection('ph')
    window.scrollTo?.({ top: 0 })
  }

  const openBuilderFor = (aminoAcid: AminoAcid) => {
    setToolAminoAcid(aminoAcid)
    setSection('builder')
    window.scrollTo?.({ top: 0 })
  }

  const openBuilder3DFor = (aminoAcid: AminoAcid) => {
    setToolAminoAcid(aminoAcid)
    setSection('builder3d')
    window.scrollTo?.({ top: 0 })
  }

  const switchSection = (next: Section) => {
    setSection(next)
    if (next === 'catalog') setView({ kind: 'list' })
    window.scrollTo?.({ top: 0 })
  }

  const subnav = (
    <nav className="subtab-bar" aria-label="Herramientas de Clasificación y Química">
      <button
        type="button"
        className="chip"
        aria-pressed={section === 'catalog'}
        onClick={() => switchSection('catalog')}
      >
        🧪 Catálogo (20)
      </button>
      <button
        type="button"
        className="chip"
        aria-pressed={section === 'ph'}
        onClick={() => switchSection('ph')}
      >
        ⚗️ Simulador de pH y pI
      </button>
      <button
        type="button"
        className="chip"
        aria-pressed={section === 'builder'}
        onClick={() => switchSection('builder')}
      >
        🧩 Constructor 2D
      </button>
      <button
        type="button"
        className="chip"
        aria-pressed={section === 'builder3d'}
        onClick={() => switchSection('builder3d')}
      >
        🔮 Constructor 3D
      </button>
      <button
        type="button"
        className="chip"
        aria-pressed={section === 'trio3d'}
        onClick={() => switchSection('trio3d')}
      >
        🎮 Juego: 3 en 3D
      </button>
      <button
        type="button"
        className="chip"
        aria-pressed={section === 'mutations'}
        onClick={() => switchSection('mutations')}
      >
        🧬 Mutaciones (BLOSUM62)
      </button>
    </nav>
  )

  if (section === 'ph') {
    return (
      <div className="classification">
        {subnav}
        <PhSimulator key={toolAminoAcid?.code3 ?? 'default'} initialAminoAcid={toolAminoAcid} />
      </div>
    )
  }

  if (section === 'builder') {
    return (
      <div className="classification">
        {subnav}
        <StructureBuilder key={toolAminoAcid?.code3 ?? 'default'} initialAminoAcid={toolAminoAcid} />
      </div>
    )
  }

  if (section === 'builder3d') {
    return (
      <div className="classification">
        {subnav}
        <StructureBuilder3D key={`build-${toolAminoAcid?.code3 ?? 'default'}`} initialAminoAcid={toolAminoAcid} initialMode="build" />
      </div>
    )
  }

  if (section === 'trio3d') {
    return (
      <div className="classification">
        {subnav}
        <StructureBuilder3D key={`trio-${toolAminoAcid?.code3 ?? 'default'}`} initialAminoAcid={toolAminoAcid} initialMode="trio-game" />
      </div>
    )
  }

  if (section === 'mutations') {
    return (
      <div className="classification">
        {subnav}
        <MutationSimulator />
      </div>
    )
  }

  if (view.kind === 'detail') {
    const aminoAcid = findAminoAcid(view.code)
    if (aminoAcid) {
      return (
        <div className="classification">
          {subnav}
          <AminoAcidDetail
            aminoAcid={aminoAcid}
            onBack={backToList}
            onNavigate={open}
            onCompare={compare}
            onOpenPhSimulator={openPhFor}
            onOpenBuilder={openBuilderFor}
            onOpenBuilder3D={openBuilder3DFor}
          />
        </div>
      )
    }
  }

  if (view.kind === 'compare') {
    const first = findAminoAcid(view.first)
    const second = findAminoAcid(view.second)
    if (first && second) {
      return (
        <div className="classification">
          {subnav}
          <CompareView first={first} second={second} onChange={compare} onBack={backToList} onOpen={open} />
        </div>
      )
    }
  }

  return (
    <div className={selected.length > 0 ? 'classification classification--comparing' : 'classification'}>
      {subnav}
      <header className="classification__intro">
        <h2>Los 20 aminoácidos</h2>
        <p>
          Agrupados según la química de su cadena lateral (clasificación de Lehninger). Toca una tarjeta para ver su
          ficha con estructura 2D, modelo 3D, propiedades y mnemotecnia, o marca dos con ⚖️ para compararlas lado a
          lado.
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
