// Datos del constructor de estructuras: fragmentos químicos arrastrables y
// receta de cadena lateral para cada uno de los 20 aminoácidos.
//
// El núcleo (H₂N–CαH–COOH) está fijo; al encadenar los fragmentos de la receta
// se reconstruye el SMILES neutro del aminoácido y se valida comparándolo con
// `aminoAcid.smiles`.

import { AMINO_ACIDS, type AminoAcid } from './aminoacids'

export interface SideChainFragment {
  id: string
  /** Fórmula condensada que se muestra en la ficha arrastrable. */
  formula: string
  /** Nombre corto del grupo o eslabón. */
  name: string
  /** Descripción breve para ayudar al estudiante. */
  hint: string
}

export const SIDE_CHAIN_FRAGMENTS: SideChainFragment[] = [
  { id: 'H', formula: '–H', name: 'Hidrógeno', hint: 'Sin carbono en la cadena lateral (exclusivo de la glicina).' },
  { id: 'CH2', formula: '–CH₂–', name: 'Metileno', hint: 'Eslabón lineal que alarga la cadena un carbono.' },
  { id: 'CH3', formula: '–CH₃', name: 'Metilo', hint: 'Extremo hidrocarbonado de un carbono.' },
  { id: 'CH_branch', formula: '–CH(CH₃)₂', name: 'Isopropilo (horquilla)', hint: 'Bifurcación en V con dos metilos terminales.' },
  { id: 'sec_butyl', formula: '–CH(CH₃)–CH₂–CH₃', name: 'sec-Butilo (quiral)', hint: 'Ramificación en el primer carbono tras el Cα.' },
  { id: 'OH', formula: '–OH', name: 'Hidroxilo', hint: 'Alcohol polar sin carga.' },
  { id: 'CHOH_CH3', formula: '–CH(OH)–CH₃', name: 'Hidroxietilo (quiral)', hint: 'Carbono secundario con –OH y –CH₃.' },
  { id: 'SH', formula: '–SH', name: 'Tiol (sulfhidrilo)', hint: 'Azufre terminal capaz de formar puentes disulfuro.' },
  { id: 'S', formula: '–S–', name: 'Tioéter', hint: 'Puente de azufre entre dos carbonos.' },
  { id: 'CONH2', formula: '–CONH₂', name: 'Carboxamida', hint: 'Grupo amida polar pero sin carga.' },
  { id: 'COOH', formula: '–COOH', name: 'Carboxilo', hint: 'Ácido carboxílico (cede H⁺ a pH fisiológico).' },
  { id: 'NH2', formula: '–NH₂', name: 'Amino primario', hint: 'Base que capta H⁺ a pH fisiológico.' },
  { id: 'guanidino', formula: '–NH–C(=NH)NH₂', name: 'Guanidino', hint: 'Tres nitrógenos que comparten una carga positiva.' },
  { id: 'phenyl', formula: '–C₆H₅', name: 'Anillo fenilo', hint: 'Anillo aromático de seis carbonos.' },
  { id: 'phenol', formula: '–C₆H₄–OH', name: 'Anillo fenol', hint: 'Anillo bencénico con un grupo –OH en posición para.' },
  { id: 'indole', formula: '–Indol (bicíclico)', name: 'Anillo indol', hint: 'Doble anillo aromático con un grupo –NH–.' },
  { id: 'imidazole', formula: '–Imidazol', name: 'Anillo imidazol', hint: 'Anillo aromático de cinco miembros con dos nitrógenos.' },
  { id: 'ring_close', formula: '(cierra anillo al Nα)', name: 'Cierre pirrolidina', hint: 'Une el extremo de tres –CH₂– con el nitrógeno α.' },
]

export const FRAGMENT_BY_ID: Record<string, SideChainFragment> = Object.fromEntries(
  SIDE_CHAIN_FRAGMENTS.map((fragment) => [fragment.id, fragment]),
)

/**
 * Secuencia ordenada de fragmentos que construyen la cadena lateral de cada
 * aminoácido desde el Cα hacia el extremo.
 */
export const SIDE_CHAIN_RECIPES: Record<string, string[]> = {
  Gly: ['H'],
  Ala: ['CH3'],
  Pro: ['CH2', 'CH2', 'CH2', 'ring_close'],
  Val: ['CH_branch'],
  Leu: ['CH2', 'CH_branch'],
  Ile: ['sec_butyl'],
  Met: ['CH2', 'CH2', 'S', 'CH3'],
  Phe: ['CH2', 'phenyl'],
  Tyr: ['CH2', 'phenol'],
  Trp: ['CH2', 'indole'],
  Ser: ['CH2', 'OH'],
  Thr: ['CHOH_CH3'],
  Cys: ['CH2', 'SH'],
  Asn: ['CH2', 'CONH2'],
  Gln: ['CH2', 'CH2', 'CONH2'],
  Lys: ['CH2', 'CH2', 'CH2', 'CH2', 'NH2'],
  Arg: ['CH2', 'CH2', 'CH2', 'guanidino'],
  His: ['CH2', 'imidazole'],
  Asp: ['CH2', 'COOH'],
  Glu: ['CH2', 'CH2', 'COOH'],
}

/** Traduce una secuencia de fragmentos al SMILES neutro resultante, si es una combinación química válida. */
export function smilesFromFragments(fragments: string[]): string | null {
  const key = fragments.join('+')
  switch (key) {
    case 'H':
      return 'NCC(=O)O'
    case 'CH3':
      return 'N[C@@H](C)C(=O)O'
    case 'CH2+CH3':
      return 'N[C@@H](CC)C(=O)O'
    case 'CH2+CH2+CH3':
      return 'N[C@@H](CCC)C(=O)O'
    case 'CH2+CH2+CH2+ring_close':
      return 'OC(=O)[C@@H]1CCCN1'
    case 'CH_branch':
      return 'N[C@@H](C(C)C)C(=O)O'
    case 'CH2+CH_branch':
      return 'N[C@@H](CC(C)C)C(=O)O'
    case 'sec_butyl':
      return 'N[C@@H]([C@@H](C)CC)C(=O)O'
    case 'CH2+CH2+S+CH3':
      return 'N[C@@H](CCSC)C(=O)O'
    case 'CH2+phenyl':
      return 'N[C@@H](Cc1ccccc1)C(=O)O'
    case 'CH2+phenol':
      return 'N[C@@H](Cc1ccc(O)cc1)C(=O)O'
    case 'CH2+indole':
      return 'N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O'
    case 'CH2+OH':
      return 'N[C@@H](CO)C(=O)O'
    case 'CHOH_CH3':
      return 'N[C@@H]([C@H](O)C)C(=O)O'
    case 'CH2+SH':
      return 'N[C@@H](CS)C(=O)O'
    case 'CH2+CONH2':
      return 'N[C@@H](CC(N)=O)C(=O)O'
    case 'CH2+CH2+CONH2':
      return 'N[C@@H](CCC(N)=O)C(=O)O'
    case 'CH2+CH2+CH2+CH2+NH2':
      return 'N[C@@H](CCCCN)C(=O)O'
    case 'CH2+CH2+CH2+guanidino':
      return 'N[C@@H](CCCNC(N)=N)C(=O)O'
    case 'CH2+imidazole':
      return 'N[C@@H](Cc1c[nH]cn1)C(=O)O'
    case 'CH2+COOH':
      return 'N[C@@H](CC(=O)O)C(=O)O'
    case 'CH2+CH2+COOH':
      return 'N[C@@H](CCC(=O)O)C(=O)O'
    default:
      return null
  }
}

export interface BuildValidation {
  matches: boolean
  builtSmiles: string | null
  matchedAminoAcid?: AminoAcid
  feedback: string
}

/** Valida los fragmentos colocados frente al aminoácido objetivo comparando el SMILES generado. */
export function validateBuiltStructure(target: AminoAcid, placedFragments: string[]): BuildValidation {
  if (placedFragments.length === 0) {
    return {
      matches: false,
      builtSmiles: null,
      feedback: 'Añade fragmentos desde la bandeja para construir la cadena lateral sobre el Cα.',
    }
  }
  const builtSmiles = smilesFromFragments(placedFragments)
  if (builtSmiles === target.smiles) {
    return {
      matches: true,
      builtSmiles,
      matchedAminoAcid: target,
      feedback: `¡Exacto! El SMILES construido (${builtSmiles}) coincide con ${target.name} (${target.code3}).`,
    }
  }
  const other = builtSmiles ? AMINO_ACIDS.find((aa) => aa.smiles === builtSmiles) : undefined
  if (other) {
    return {
      matches: false,
      builtSmiles,
      matchedAminoAcid: other,
      feedback: `Has armado ${other.name} (${other.code3}), no ${target.name}. Revisa la longitud o el grupo funcional.`,
    }
  }
  const recipe = SIDE_CHAIN_RECIPES[target.code3] ?? []
  if (placedFragments.length < recipe.length && recipe.slice(0, placedFragments.length).join('+') === placedFragments.join('+')) {
    return {
      matches: false,
      builtSmiles,
      feedback: `Vas por buen camino (${placedFragments.length} de ${recipe.length} fragmentos); falta rematar la cadena lateral.`,
    }
  }
  return {
    matches: false,
    builtSmiles,
    feedback: `Esa combinación de fragmentos no forma la cadena lateral de ${target.name}. Prueba a quitar el último eslabón o consultar la pista.`,
  }
}
