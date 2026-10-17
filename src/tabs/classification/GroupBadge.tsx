import { GROUPS, type AminoAcid } from '../../data/aminoacids'

export function GroupBadge({ aminoAcid }: { aminoAcid: AminoAcid }) {
  const group = GROUPS[aminoAcid.group]
  return (
    <span className="group-badge" style={{ '--group-color': `var(${group.cssVar})` } as React.CSSProperties}>
      {group.label}
    </span>
  )
}
