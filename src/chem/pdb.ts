// Analizador de archivos PDB para la pestaña de Proteínas (Fase 4).
//
// Extrae título, cadenas, residuos de los 20 aminoácidos estándar (usando
// siempre la primera conformación alternativa), verifica si la cadena lateral
// tiene todos sus átomos pesados, calcula ángulos φ/ψ, estructura secundaria,
// exposición al solvente (aproximación por número de coordinación de átomos
// pesados vecinos), puentes disulfuro, puentes salinos y cercanía a ligandos.

import { AMINO_ACIDS, BACKBONE_ATOMS, findAminoAcid, type AminoAcid } from '../data/aminoacids'
import { dihedral, distance } from './geometry'

export type SecondaryStructure = 'helix' | 'sheet' | 'coil'
export type BurialState = 'exposed' | 'buried'

export interface PdbAtom {
  serial: number
  name: string
  altLoc: string
  resName: string
  chain: string
  resSeq: number
  x: number
  y: number
  z: number
  bFactor: number
  element: string
  hetatm: boolean
}

export interface ProteinResidue {
  /** Identificador único `chain:resSeq`, p. ej. `A:27`. */
  key: string
  chain: string
  resSeq: number
  resName: string
  aminoAcid: AminoAcid
  atoms: PdbAtom[]
  /** `true` si tiene todos los átomos pesados esperados de su cadena lateral. */
  completeSideChain: boolean
  secondaryStructure: SecondaryStructure
  phi: number | null
  psi: number | null
  burial: BurialState
  /** Número de átomos pesados de otros residuos a menos de 6.5 Å de la cadena lateral. */
  neighborCount: number
  /** Clave del otro residuo si participa en un puente disulfuro. */
  disulfidePartner?: string
  /** Claves de residuos con los que forma un puente salino. */
  saltBridgePartners: string[]
  /** `true` si está a < 5 Å de un ligando no acuoso. */
  nearLigand: boolean
}

export interface DisulfideBond {
  fromKey: string
  toKey: string
  distance: number
  fromAtom: PdbAtom
  toAtom: PdbAtom
}

export interface SaltBridge {
  positiveKey: string
  negativeKey: string
  distance: number
  positiveAtom: PdbAtom
  negativeAtom: PdbAtom
}

export interface ParsedProtein {
  id: string
  title: string
  chains: string[]
  residues: ProteinResidue[]
  ligandNames: string[]
  disulfides: DisulfideBond[]
  saltBridges: SaltBridge[]
  /** Texto PDB original. */
  rawPdb: string
}

/** Número esperado de átomos pesados por aminoácido (N, CA, C, O + cadena lateral, sin OXT). */
const EXPECTED_HEAVY_ATOMS: Record<string, string[]> = {
  GLY: ['N', 'CA', 'C', 'O'],
  ALA: ['N', 'CA', 'C', 'O', 'CB'],
  PRO: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD'],
  VAL: ['N', 'CA', 'C', 'O', 'CB', 'CG1', 'CG2'],
  LEU: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2'],
  ILE: ['N', 'CA', 'C', 'O', 'CB', 'CG1', 'CG2', 'CD1'],
  MET: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'SD', 'CE'],
  PHE: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ'],
  TYR: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ', 'OH'],
  TRP: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', 'NE1', 'CE2', 'CE3', 'CZ2', 'CZ3', 'CH2'],
  SER: ['N', 'CA', 'C', 'O', 'CB', 'OG'],
  THR: ['N', 'CA', 'C', 'O', 'CB', 'OG1', 'CG2'],
  CYS: ['N', 'CA', 'C', 'O', 'CB', 'SG'],
  ASN: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'ND2'],
  GLN: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'OE1', 'NE2'],
  LYS: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'CE', 'NZ'],
  ARG: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'NE', 'CZ', 'NH1', 'NH2'],
  HIS: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'ND1', 'CD2', 'CE1', 'NE2'],
  ASP: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'OD2'],
  GLU: ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'OE1', 'OE2'],
}

const SOLVENT_RESNAMES = new Set(['HOH', 'WAT', 'DOD', 'SO4', 'PO4', 'NA', 'CL', 'MG', 'CA', 'ZN', 'K'])

const POSITIVE_ATOMS: Record<string, string[]> = {
  LYS: ['NZ'],
  ARG: ['NE', 'NH1', 'NH2'],
  HIS: ['ND1', 'NE2'],
}

const NEGATIVE_ATOMS: Record<string, string[]> = {
  ASP: ['OD1', 'OD2'],
  GLU: ['OE1', 'OE2'],
}

interface SsRange {
  chain: string
  start: number
  end: number
  kind: SecondaryStructure
}

function deduceElement(atomName: string, explicitElement: string): string {
  const clean = explicitElement.trim().toUpperCase()
  if (clean) return clean
  const letters = atomName.replace(/[^A-Za-z]/g, '').toUpperCase()
  return letters.slice(0, 1) || 'C'
}

export function residueKey(chain: string, resSeq: number): string {
  return `${chain}:${resSeq}`
}

/** Parsea un archivo en formato PDB y calcula las propiedades estructurales de sus residuos. */
export function parsePdb(rawPdb: string, fallbackId = 'PDB'): ParsedProtein {
  const lines = rawPdb.split(/\r?\n/)
  let headerId = ''
  const titleParts: string[] = []
  const ssRanges: SsRange[] = []
  const atoms: PdbAtom[] = []
  const ligandAtoms: PdbAtom[] = []
  const ligandNamesSet = new Set<string>()

  // Para cada residuo y nombre de átomo, se recuerda el primer `altLoc` visto.
  const firstAltLoc = new Map<string, string>()

  for (const line of lines) {
    const record = line.slice(0, 6).trim()
    if (record === 'HEADER') {
      const code = line.slice(62, 66).trim()
      if (code) headerId = code
    } else if (record === 'TITLE') {
      const part = line.slice(10, 80).trim()
      if (part) titleParts.push(part)
    } else if (record === 'HELIX') {
      const chain = line.slice(19, 20).trim() || 'A'
      const start = Number(line.slice(21, 25).trim())
      const end = Number(line.slice(33, 37).trim())
      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        ssRanges.push({ chain, start, end, kind: 'helix' })
      }
    } else if (record === 'SHEET') {
      const chain = line.slice(21, 22).trim() || 'A'
      const start = Number(line.slice(22, 26).trim())
      const end = Number(line.slice(33, 37).trim())
      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        ssRanges.push({ chain, start, end, kind: 'sheet' })
      }
    } else if (record === 'ATOM' || record === 'HETATM') {
      if (line.length < 54) continue
      const serial = Number(line.slice(6, 11).trim())
      const name = line.slice(12, 16).trim()
      const altLoc = line.slice(16, 17).trim()
      const resName = line.slice(17, 20).trim().toUpperCase()
      const chain = line.slice(21, 22).trim() || 'A'
      const resSeq = Number(line.slice(22, 26).trim())
      const iCode = line.slice(26, 27).trim()
      // Excluir inserciones duplicadas para mantener numeración unívoca
      if (iCode !== '') continue

      const x = Number(line.slice(30, 38).trim())
      const y = Number(line.slice(38, 46).trim())
      const z = Number(line.slice(46, 54).trim())
      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z) || Number.isNaN(resSeq)) continue
      const bFactor = Number(line.slice(60, 66).trim()) || 0
      const element = deduceElement(name, line.slice(76, 78))

      // Primera conformación alternativa solamente
      const atomKey = `${chain}:${resSeq}:${name}`
      if (altLoc !== '') {
        const chosen = firstAltLoc.get(atomKey)
        if (chosen === undefined) {
          firstAltLoc.set(atomKey, altLoc)
        } else if (chosen !== altLoc) {
          continue
        }
      }

      const atom: PdbAtom = {
        serial,
        name,
        altLoc,
        resName,
        chain,
        resSeq,
        x,
        y,
        z,
        bFactor,
        element,
        hetatm: record === 'HETATM',
      }

      if (record === 'ATOM') {
        atoms.push(atom)
      } else if (!SOLVENT_RESNAMES.has(resName)) {
        ligandAtoms.push(atom)
        ligandNamesSet.add(resName)
      }
    } else if (record === 'ENDMDL') {
      // En archivos NMR con múltiples modelos se toma únicamente el modelo 1.
      break
    }
  }

  // Agrupar átomos por residuo estándar
  const residueMap = new Map<string, { chain: string; resSeq: number; resName: string; aminoAcid: AminoAcid; atoms: PdbAtom[] }>()
  for (const atom of atoms) {
    const aa = findAminoAcid(atom.resName)
    if (!aa || !aa.standard) continue
    const key = residueKey(atom.chain, atom.resSeq)
    let entry = residueMap.get(key)
    if (!entry) {
      entry = { chain: atom.chain, resSeq: atom.resSeq, resName: atom.resName, aminoAcid: aa, atoms: [] }
      residueMap.set(key, entry)
    }
    // Evitar átomos duplicados
    if (!entry.atoms.some((a) => a.name === atom.name)) {
      entry.atoms.push(atom)
    }
  }

  const residues: ProteinResidue[] = Array.from(residueMap.entries()).map(([key, item]) => {
    const expected = EXPECTED_HEAVY_ATOMS[item.resName] ?? ['N', 'CA', 'C', 'O']
    const presentNames = new Set(item.atoms.filter((a) => a.element !== 'H').map((a) => a.name))
    const completeSideChain = expected.every((name) => presentNames.has(name))

    const ssMatch = ssRanges.find(
      (r) => r.chain === item.chain && item.resSeq >= r.start && item.resSeq <= r.end,
    )

    return {
      key,
      chain: item.chain,
      resSeq: item.resSeq,
      resName: item.resName,
      aminoAcid: item.aminoAcid,
      atoms: item.atoms,
      completeSideChain,
      secondaryStructure: ssMatch?.kind ?? 'coil',
      phi: null,
      psi: null,
      burial: 'exposed',
      neighborCount: 0,
      saltBridgePartners: [],
      nearLigand: false,
    }
  })

  // Calcular ángulos diedros φ y ψ entre residuos consecutivos de la misma cadena
  for (let i = 0; i < residues.length; i++) {
    const curr = residues[i]
    const prev = i > 0 ? residues[i - 1] : undefined
    const next = i + 1 < residues.length ? residues[i + 1] : undefined
    const nAtom = curr.atoms.find((a) => a.name === 'N')
    const caAtom = curr.atoms.find((a) => a.name === 'CA')
    const cAtom = curr.atoms.find((a) => a.name === 'C')

    if (prev && prev.chain === curr.chain && prev.resSeq === curr.resSeq - 1 && nAtom && caAtom && cAtom) {
      const prevC = prev.atoms.find((a) => a.name === 'C')
      if (prevC && distance(prevC, nAtom) < 2.0) {
        curr.phi = Number(dihedral(prevC, nAtom, caAtom, cAtom).toFixed(1))
      }
    }
    if (next && next.chain === curr.chain && next.resSeq === curr.resSeq + 1 && nAtom && caAtom && cAtom) {
      const nextN = next.atoms.find((a) => a.name === 'N')
      if (nextN && distance(cAtom, nextN) < 2.0) {
        curr.psi = Number(dihedral(nAtom, caAtom, cAtom, nextN).toFixed(1))
      }
    }

    // Si el archivo no traía registros HELIX/SHEET, deducir por φ/ψ
    if (ssRanges.length === 0 && curr.phi !== null && curr.psi !== null) {
      if (curr.phi >= -100 && curr.phi <= -35 && curr.psi >= -70 && curr.psi <= -15) {
        curr.secondaryStructure = 'helix'
      } else if (curr.phi >= -170 && curr.phi <= -70 && (curr.psi >= 90 || curr.psi <= -120)) {
        curr.secondaryStructure = 'sheet'
      }
    }
  }

  // Exposición al solvente (enterrado vs expuesto): número de átomos Cα/pesados vecinos a < 8 Å del Cβ (o Cα en Gly)
  const probeCenters = residues.map((res) => {
    return res.atoms.find((a) => a.name === 'CB') ?? res.atoms.find((a) => a.name === 'CA') ?? res.atoms[0]
  })
  for (let i = 0; i < residues.length; i++) {
    const center = probeCenters[i]
    if (!center) continue
    let neighbors = 0
    for (let j = 0; j < residues.length; j++) {
      if (i === j || !probeCenters[j]) continue
      if (distance(center, probeCenters[j]) <= 7.5) {
        neighbors++
      }
    }
    residues[i].neighborCount = neighbors
    // En proteínas globulares pequeñas/medianas, >= 9 Cβ vecinos en 7.5 Å indica núcleo enterrado
    residues[i].burial = neighbors >= 9 ? 'buried' : 'exposed'
  }

  // Cercanía a ligandos (< 5 Å de cualquier átomo de ligando no acuoso)
  if (ligandAtoms.length > 0) {
    for (const res of residues) {
      const heavy = res.atoms.filter((a) => a.element !== 'H')
      res.nearLigand = heavy.some((atom) => ligandAtoms.some((lig) => distance(atom, lig) < 5.0))
    }
  }

  // Puentes disulfuro: Cys con SG–SG <= 2.3 Å
  const disulfides: DisulfideBond[] = []
  const cysteines = residues.filter((r) => r.resName === 'CYS')
  for (let i = 0; i < cysteines.length; i++) {
    const sgA = cysteines[i].atoms.find((a) => a.name === 'SG')
    if (!sgA) continue
    for (let j = i + 1; j < cysteines.length; j++) {
      const sgB = cysteines[j].atoms.find((a) => a.name === 'SG')
      if (!sgB) continue
      const d = distance(sgA, sgB)
      if (d <= 2.35) {
        cysteines[i].disulfidePartner = cysteines[j].key
        cysteines[j].disulfidePartner = cysteines[i].key
        disulfides.push({
          fromKey: cysteines[i].key,
          toKey: cysteines[j].key,
          distance: Number(d.toFixed(2)),
          fromAtom: sgA,
          toAtom: sgB,
        })
      }
    }
  }

  // Puentes salinos: residuo básico (Lys, Arg, His) y ácido (Asp, Glu) con N+/O- a <= 4.2 Å
  const saltBridges: SaltBridge[] = []
  const positives = residues.filter((r) => r.resName in POSITIVE_ATOMS)
  const negatives = residues.filter((r) => r.resName in NEGATIVE_ATOMS)
  for (const pos of positives) {
    const posNames = POSITIVE_ATOMS[pos.resName] ?? []
    const posAtoms = pos.atoms.filter((a) => posNames.includes(a.name))
    for (const neg of negatives) {
      const negNames = NEGATIVE_ATOMS[neg.resName] ?? []
      const negAtoms = neg.atoms.filter((a) => negNames.includes(a.name))
      let bestDist = Infinity
      let bestPos: PdbAtom | null = null
      let bestNeg: PdbAtom | null = null
      for (const pa of posAtoms) {
        for (const na of negAtoms) {
          const d = distance(pa, na)
          if (d < bestDist) {
            bestDist = d
            bestPos = pa
            bestNeg = na
          }
        }
      }
      if (bestDist <= 4.2 && bestPos && bestNeg) {
        pos.saltBridgePartners.push(neg.key)
        neg.saltBridgePartners.push(pos.key)
        saltBridges.push({
          positiveKey: pos.key,
          negativeKey: neg.key,
          distance: Number(bestDist.toFixed(2)),
          positiveAtom: bestPos,
          negativeAtom: bestNeg,
        })
      }
    }
  }

  const chains = Array.from(new Set(residues.map((r) => r.chain)))
  const id = (headerId || fallbackId).toUpperCase()
  const rawTitle = titleParts.join(' ').replace(/\s+/g, ' ').trim()
  const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1).toLowerCase() : `Estructura ${id}`

  return {
    id,
    title,
    chains,
    residues,
    ligandNames: Array.from(ligandNamesSet),
    disulfides,
    saltBridges,
    rawPdb,
  }
}

/** Residuos aptos para preguntar en el quiz «¿Qué cadena lateral es esta?»: estándar y con cadena lateral completa. */
export function eligibleQuizResidues(protein: ParsedProtein): ProteinResidue[] {
  return protein.residues.filter((res) => res.aminoAcid.standard && res.completeSideChain)
}

/** Indica si un átomo pertenece a la cadena lateral (o es el Cα en el caso de la glicina). */
export function isSideChainOrGlyCa(atomName: string, resName: string): boolean {
  if (resName.toUpperCase() === 'GLY') return atomName === 'CA'
  return !BACKBONE_ATOMS.includes(atomName)
}

export const SECONDARY_STRUCTURE_LABELS: Record<SecondaryStructure, string> = {
  helix: 'Hélice α',
  sheet: 'Lámina β',
  coil: 'Bucle / giro (coil)',
}

export const BURIAL_LABELS: Record<BurialState, string> = {
  exposed: 'Expuesto en la superficie',
  buried: 'Enterrado en el núcleo',
}

/** Evalúa didácticamente si tiene sentido químico que un residuo esté expuesto o enterrado. */
export function explainBurialSense(residue: ProteinResidue): { makesSense: boolean; explanation: string } {
  const aa = residue.aminoAcid
  const hydrophobic = aa.hydropathy > 0.5
  const hydrophilic = aa.hydropathy < -0.5

  if (residue.burial === 'buried') {
    if (hydrophobic) {
      return {
        makesSense: true,
        explanation: `Sí tiene sentido: ${aa.name} (${aa.code3}) es hidrofóbico (KD +${aa.hydropathy}) y rehúye el agua, estabilizando el núcleo apolar.`,
      }
    }
    if (residue.saltBridgePartners.length > 0 || residue.disulfidePartner) {
      return {
        makesSense: true,
        explanation: `Aunque ${aa.name} es polar/cargado, está compensado en el interior por una interacción específica (${residue.disulfidePartner ? 'puente disulfuro' : 'puente salino'}).`,
      }
    }
    return {
      makesSense: false,
      explanation: `Es inusual ver a ${aa.name} (KD ${aa.hydropathy}) enterrado sin pareja iónica; suele ocurrir cuando participa en un sitio activo o forma puentes de H internos.`,
    }
  }

  // Expuesto
  if (hydrophilic) {
    return {
      makesSense: true,
      explanation: `Sí tiene sentido: ${aa.name} (${aa.code3}) es hidrofílico (KD ${aa.hydropathy}) e interactúa favorablemente con las moléculas de agua de la superficie.`,
    }
  }
  return {
    makesSense: false,
    explanation: `${aa.name} (${aa.code3}) es apolar (KD +${aa.hydropathy}), pero está en la superficie; los parches hidrofóbicos expuestos suelen participar en interfaces proteína-proteína o unión a ligandos.`,
  }
}

export function listStandardCodes(): string[] {
  return AMINO_ACIDS.map((aa) => aa.code3)
}
