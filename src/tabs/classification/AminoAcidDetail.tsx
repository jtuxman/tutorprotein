import { MolViewer, aminoAcidMolecule } from '../../components/MolViewer'
import { Structure2D } from '../../components/Structure2D'
import { AMINO_ACIDS, GROUPS, type AminoAcid } from '../../data/aminoacids'
import { GroupBadge } from './GroupBadge'
import { PROPERTIES } from './properties'

interface AminoAcidDetailProps {
  aminoAcid: AminoAcid
  onBack: () => void
  onNavigate: (aminoAcid: AminoAcid) => void
  onCompare: (first: AminoAcid, second: AminoAcid) => void
}

export function AminoAcidDetail({ aminoAcid, onBack, onNavigate, onCompare }: AminoAcidDetailProps) {
  const index = AMINO_ACIDS.indexOf(aminoAcid)
  const previous = AMINO_ACIDS[(index - 1 + AMINO_ACIDS.length) % AMINO_ACIDS.length]
  const next = AMINO_ACIDS[(index + 1) % AMINO_ACIDS.length]

  return (
    <article
      className="aa-detail"
      style={{ '--group-color': `var(${GROUPS[aminoAcid.group].cssVar})` } as React.CSSProperties}
    >
      <nav className="aa-detail__nav" aria-label="Navegación de la ficha">
        <button type="button" className="pill-button" onClick={onBack}>
          ← Volver
        </button>
        <span className="aa-detail__steps">
          <button type="button" className="pill-button" onClick={() => onNavigate(previous)}>
            ‹ <span className="aa-detail__step-name">{previous.name}</span>
            <span className="visually-hidden"> (anterior)</span>
          </button>
          <button type="button" className="pill-button" onClick={() => onNavigate(next)}>
            <span className="aa-detail__step-name">{next.name}</span>
            <span className="visually-hidden"> (siguiente)</span> ›
          </button>
        </span>
      </nav>

      <header className="aa-detail__header">
        <span className="aa-detail__letter" aria-hidden="true">
          {aminoAcid.code1}
        </span>
        <div>
          <h2>{aminoAcid.name}</h2>
          <p className="aa-detail__subtitle">
            {aminoAcid.code3} · {aminoAcid.code1} <GroupBadge aminoAcid={aminoAcid} />
          </p>
        </div>
      </header>
      <p className="aa-detail__note">{aminoAcid.note}</p>

      <label className="aa-detail__compare">
        <span aria-hidden="true">⚖️</span> Comparar con
        <select
          value=""
          onChange={(event) => {
            const other = AMINO_ACIDS.find((aa) => aa.code3 === event.target.value)
            if (other) onCompare(aminoAcid, other)
          }}
        >
          <option value="">Elige otro aminoácido…</option>
          {AMINO_ACIDS.filter((aa) => aa !== aminoAcid).map((aa) => (
            <option key={aa.code3} value={aa.code3}>
              {aa.name} ({aa.code3})
            </option>
          ))}
        </select>
      </label>

      <div className="aa-detail__structures">
        <section className="panel" aria-label="Estructura 2D">
          <h3>Estructura 2D</h3>
          <Structure2D smiles={aminoAcid.smiles} ariaLabel={`Estructura 2D de ${aminoAcid.name}`} />
          <p className="panel__caption">Forma neutra: –NH₂ y –COOH sin carga.</p>
        </section>
        <section className="panel" aria-label="Estructura 3D">
          <h3>Estructura 3D</h3>
          <MolViewer molecule={aminoAcidMolecule(aminoAcid)} />
        </section>
      </div>

      <section className="panel" aria-label="Propiedades">
        <h3>Propiedades</h3>
        <table className="property-table">
          <tbody>
            {PROPERTIES.filter((property) => property.id !== 'note').map((property) => (
              <tr key={property.id}>
                <th scope="row">{property.label}</th>
                <td>{property.render ? property.render(aminoAcid) : property.text(aminoAcid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  )
}
