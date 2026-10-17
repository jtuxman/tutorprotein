import { Structure2D } from '../../components/Structure2D'
import { GROUPS, type AminoAcid } from '../../data/aminoacids'
import { formatSigned } from '../../format'
import { HYDROPATHY_LABELS, hydropathyKind } from './filters'

interface AminoAcidCardProps {
  aminoAcid: AminoAcid
  onOpen: (aminoAcid: AminoAcid) => void
  /** Marcado para comparar. */
  selected: boolean
  onToggleSelected: (aminoAcid: AminoAcid) => void
}

export function AminoAcidCard({ aminoAcid, onOpen, selected, onToggleSelected }: AminoAcidCardProps) {
  const hydroKind = hydropathyKind(aminoAcid)
  return (
    <li
      className={`aa-card${selected ? ' aa-card--selected' : ''}`}
      style={{ '--group-color': `var(${GROUPS[aminoAcid.group].cssVar})` } as React.CSSProperties}
    >
      <button type="button" className="aa-card__open" onClick={() => onOpen(aminoAcid)}>
        <Structure2D smiles={aminoAcid.smiles} ariaLabel={`Estructura 2D de ${aminoAcid.name}`} />
        <span className="aa-card__name">{aminoAcid.name}</span>
        <span className="aa-card__codes">
          <span>{aminoAcid.code3}</span>
          <span className="aa-card__code1">{aminoAcid.code1}</span>
        </span>
        <span className={`aa-card__hydro aa-card__hydro--${hydroKind}`}>
          {HYDROPATHY_LABELS[hydroKind]} ({formatSigned(aminoAcid.hydropathy, 1)})
        </span>
      </button>
      <button
        type="button"
        className="aa-card__compare"
        aria-pressed={selected}
        aria-label={`Comparar ${aminoAcid.name}`}
        title="Elegir para comparar"
        onClick={() => onToggleSelected(aminoAcid)}
      >
        ⚖️
      </button>
    </li>
  )
}
