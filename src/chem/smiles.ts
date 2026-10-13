// Lectura mínima de SMILES: cuenta átomos (con hidrógenos implícitos) del
// subconjunto que usan los aminoácidos. No dibuja ni valida estereoquímica.

export type Formula = Record<string, number>

const VALENCE: Record<string, number> = { C: 4, N: 3, O: 2, S: 2 }
const BOND_ORDER: Record<string, number> = { '-': 1, '=': 2, '#': 3 }

interface SmilesAtom {
  element: string
  aromatic: boolean
  /** Hidrógenos escritos entre corchetes; `null` si hay que deducirlos por valencia. */
  explicitH: number | null
  bondOrderSum: number
}

/** Fórmula molecular (con H) de un SMILES sin cargas formales. */
export function formulaFromSmiles(smiles: string): Formula {
  const atoms: SmilesAtom[] = []
  const branches: number[] = []
  const ringOpenings = new Map<string, { atom: number; order: number | null }>()
  let previous = -1
  let pendingOrder: number | null = null

  const bond = (a: number, b: number, order: number | null) => {
    const value = order ?? 1
    atoms[a].bondOrderSum += value
    atoms[b].bondOrderSum += value
  }
  const addAtom = (atom: SmilesAtom) => {
    atoms.push(atom)
    const index = atoms.length - 1
    if (previous >= 0) bond(previous, index, pendingOrder)
    pendingOrder = null
    previous = index
  }

  for (let i = 0; i < smiles.length; i++) {
    const char = smiles[i]
    if (char === '[') {
      const close = smiles.indexOf(']', i)
      const match = /^([A-Z][a-z]?|[cnos])(@{0,2})(H(\d*))?$/.exec(smiles.slice(i + 1, close))
      if (!match) throw new Error(`Átomo no soportado en "${smiles}": ${smiles.slice(i, close + 1)}`)
      const symbol = match[1]
      addAtom({
        element: symbol.toUpperCase(),
        aromatic: symbol === symbol.toLowerCase(),
        explicitH: match[3] ? Number(match[4] || 1) : 0,
        bondOrderSum: 0,
      })
      i = close
    } else if (char === '(') {
      branches.push(previous)
    } else if (char === ')') {
      previous = branches.pop() ?? -1
    } else if (char in BOND_ORDER) {
      pendingOrder = BOND_ORDER[char]
    } else if (/\d/.test(char)) {
      const opening = ringOpenings.get(char)
      if (opening) {
        bond(opening.atom, previous, opening.order ?? pendingOrder)
        ringOpenings.delete(char)
      } else {
        ringOpenings.set(char, { atom: previous, order: pendingOrder })
      }
      pendingOrder = null
    } else if (/[CNOS]/.test(char) || /[cnos]/.test(char)) {
      addAtom({
        element: char.toUpperCase(),
        aromatic: char === char.toLowerCase(),
        explicitH: null,
        bondOrderSum: 0,
      })
    } else {
      throw new Error(`Carácter no soportado en "${smiles}": ${char}`)
    }
  }

  const formula: Formula = {}
  const add = (element: string, count: number) => {
    if (count > 0) formula[element] = (formula[element] ?? 0) + count
  }
  for (const atom of atoms) {
    add(atom.element, 1)
    // Un átomo aromático aporta un enlace más al sistema π.
    const used = atom.bondOrderSum + (atom.aromatic ? 1 : 0)
    add('H', atom.explicitH ?? VALENCE[atom.element] - used)
  }
  return formula
}

/** Indica si la molécula contiene el elemento dado (p. ej. 'S' para Cys y Met). */
export function hasElement(smiles: string, element: string): boolean {
  return (formulaFromSmiles(smiles)[element] ?? 0) > 0
}
