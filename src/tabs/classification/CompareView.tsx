import { useState } from 'react'
import {
  DEFAULT_VIEWER_STATE,
  MolViewer,
  aminoAcidMolecule,
  type MolViewerState,
} from '../../components/MolViewer'
import { Structure2D } from '../../components/Structure2D'
import { AMINO_ACIDS, GROUPS, type AminoAcid } from '../../data/aminoacids'
import { PROPERTIES } from './properties'

const ALWAYS_DIFFERENT = ['name', 'codes', 'note']

interface CompareViewProps {
  first: AminoAcid
  second: AminoAcid
  onChange: (first: AminoAcid, second: AminoAcid) => void
  onBack: () => void
  onOpen: (aminoAcid: AminoAcid) => void
}

interface ColumnProps {
  label: string
  aminoAcid: AminoAcid
  viewerState: MolViewerState
  onViewerStateChange: (state: MolViewerState) => void
  onSelect: (aminoAcid: AminoAcid) => void
  onOpen: (aminoAcid: AminoAcid) => void
}

function Column({ label, aminoAcid, viewerState, onViewerStateChange, onSelect, onOpen }: ColumnProps) {
  return (
    <section
      className="panel compare__column"
      aria-label={label}
      style={{ '--group-color': `var(${GROUPS[aminoAcid.group].cssVar})` } as React.CSSProperties}
    >
      <header className="compare__column-header">
        <span className="aa-card__code1" aria-hidden="true">
          {aminoAcid.code1}
        </span>
        <label className="compare__select">
          <span className="visually-hidden">{label}</span>
          <select
            value={aminoAcid.code3}
            onChange={(event) => onSelect(AMINO_ACIDS.find((aa) => aa.code3 === event.target.value) ?? aminoAcid)}
          >
            {AMINO_ACIDS.map((aa) => (
              <option key={aa.code3} value={aa.code3}>
                {aa.name} ({aa.code3})
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="link-button" onClick={() => onOpen(aminoAcid)}>
          Ver ficha
        </button>
      </header>
      <div className="compare__2d">
        <Structure2D smiles={aminoAcid.smiles} ariaLabel={`Estructura 2D de ${aminoAcid.name}`} />
      </div>
      <MolViewer molecule={aminoAcidMolecule(aminoAcid)} {...viewerState} onStateChange={onViewerStateChange} />
    </section>
  )
}

export function CompareView({ first, second, onChange, onBack, onOpen }: CompareViewProps) {
  // Los dos visores comparten representación, color y superficie: cambiar uno cambia ambos.
  const [viewerState, setViewerState] = useState<MolViewerState>(DEFAULT_VIEWER_STATE)
  // Nombre, códigos y nota siempre difieren: no se marcan para no tapar las diferencias químicas.
  const rows = PROPERTIES.map((property) => ({
    property,
    differs: !ALWAYS_DIFFERENT.includes(property.id) && property.text(first) !== property.text(second),
  }))
  const differences = rows.filter((row) => row.differs).length

  return (
    <article className="compare">
      <nav className="aa-detail__nav" aria-label="Navegación de la comparación">
        <button type="button" className="pill-button" onClick={onBack}>
          ← Volver
        </button>
        <button type="button" className="pill-button" onClick={() => onChange(second, first)}>
          ⇄ Intercambiar
        </button>
      </nav>

      <header className="classification__intro">
        <h2>
          {first.name} <span aria-hidden="true">⚖️</span>
          <span className="visually-hidden"> comparado con </span> {second.name}
        </h2>
        <p>Los dos visores se mueven por separado, pero comparten representación, color y superficie.</p>
      </header>

      <div className="compare__columns">
        <Column
          label="Primer aminoácido"
          aminoAcid={first}
          viewerState={viewerState}
          onViewerStateChange={setViewerState}
          onSelect={(aminoAcid) => onChange(aminoAcid, second)}
          onOpen={onOpen}
        />
        <Column
          label="Segundo aminoácido"
          aminoAcid={second}
          viewerState={viewerState}
          onViewerStateChange={setViewerState}
          onSelect={(aminoAcid) => onChange(first, aminoAcid)}
          onOpen={onOpen}
        />
      </div>

      <section className="panel" aria-label="Propiedades comparadas">
        <h3>
          Propiedades{' '}
          <span className="compare__summary">
            {first === second
              ? 'Es el mismo aminoácido en ambos lados'
              : `${differences} ${differences === 1 ? 'diferencia' : 'diferencias'}, marcadas con ≠`}
          </span>
        </h3>
        <table className="property-table property-table--compare">
          <thead>
            <tr>
              <th scope="col">Propiedad</th>
              <th scope="col">{first.code3}</th>
              <th scope="col">{second.code3}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ property, differs }) => (
              <tr key={property.id} className={differs ? 'property-table__row--differs' : undefined}>
                <th scope="row">
                  {property.label}
                  {differs && (
                    <span className="property-table__differs" title="Distinto">
                      {' '}
                      ≠
                    </span>
                  )}
                </th>
                <td>{property.render ? property.render(first) : property.text(first)}</td>
                <td>{property.render ? property.render(second) : property.text(second)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  )
}
