import { Structure2D } from '../../components/Structure2D'
import { GROUPS, type AminoAcid } from '../../data/aminoacids'

interface AminoAcidCardProps {
  aminoAcid: AminoAcid
  onOpen: (aminoAcid: AminoAcid) => void
}

export function AminoAcidCard({ aminoAcid, onOpen }: AminoAcidCardProps) {
  return (
    <li
      className="aa-card"
      style={{ '--group-color': `var(${GROUPS[aminoAcid.group].cssVar})` } as React.CSSProperties}
    >
      <button type="button" className="aa-card__open" onClick={() => onOpen(aminoAcid)}>
        <Structure2D smiles={aminoAcid.smiles} ariaLabel={`Estructura 2D de ${aminoAcid.name}`} />
        <span className="aa-card__name">{aminoAcid.name}</span>
        <span className="aa-card__codes">
          <span>{aminoAcid.code3}</span>
          <span className="aa-card__code1">{aminoAcid.code1}</span>
        </span>
      </button>
    </li>
  )
}
