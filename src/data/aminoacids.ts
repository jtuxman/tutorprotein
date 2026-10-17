// Fuente única de datos de los aminoácidos de AminoLab.
//
// Valores numéricos (Mr, pK1, pK2, pKR, pI, índice de hidropatía): Nelson & Cox,
// "Lehninger Principles of Biochemistry", 8.ª ed. (2021), Tabla 3-1. Cotejados
// valor por valor con esa tabla el 2026-10-16: coinciden. El índice de
// hidropatía de esa tabla es la escala de Kyte & Doolittle (J. Mol. Biol. 157:105, 1982).
// Clasificación en 5 grupos y esencialidad (humanos adultos): también Lehninger.
// Codones: código genético estándar, en ARN.
// SMILES: forma neutra (–NH2 / –COOH, cadenas laterales sin carga), isomérico, serie L.
// Nombres de átomo de los grupos ionizables: Chemical Component Dictionary (wwPDB).
//
// Las notas son texto original de AminoLab.

export type LehningerGroup = 'nonpolar' | 'aromatic' | 'polar' | 'positive' | 'negative'
export type Essentiality = 'essential' | 'conditional' | 'nonessential'

export interface IonizableGroup {
  kind: 'alpha-carboxyl' | 'alpha-amino' | 'side-chain'
  pKa: number
  /** 'acid': neutro protonado, −1 desprotonado. 'base': +1 protonado, neutro desprotonado. */
  type: 'acid' | 'base'
  /** Átomos pesados (nombres CCD) sobre los que se reparte la carga, p. ej. ['OD1', 'OD2']. */
  atoms: string[]
}

export interface AminoAcid {
  /** Código de 3 letras para mostrar ('Ala'); el código CCD es `code3.toUpperCase()`. */
  code3: string
  code1: string
  name: string
  /** Otros nombres con los que se puede buscar. */
  aliases: string[]
  group: LehningerGroup
  /** Forma neutra, isomérico. */
  smiles: string
  /** Mr del aminoácido libre (g/mol). */
  molecularWeight: number
  pKa: { carboxyl: number; amino: number; sideChain?: number }
  pI: number
  /** Índice de hidropatía de Kyte-Doolittle. */
  hydropathy: number
  essentiality: Essentiality
  /** Codones en ARN. */
  codons: string[]
  standard: boolean
  /** Una frase característica. */
  note: string
  ionizableGroups: IonizableGroup[]
}

export interface GroupInfo {
  label: string
  cssVar: string
  /** Criterio que reúne a los aminoácidos del grupo. */
  description: string
  /** Por qué el grupo se llama así, en párrafos. Texto original. */
  explanation: string[]
}

export const GROUP_ORDER: LehningerGroup[] = ['nonpolar', 'aromatic', 'polar', 'positive', 'negative']

export const GROUPS: Record<LehningerGroup, GroupInfo> = {
  nonpolar: {
    label: 'No polares alifáticos',
    cssVar: '--group-nonpolar',
    description:
      'Cadenas laterales hechas casi solo de carbono e hidrógeno: no forman puentes de hidrógeno y suelen esconderse del agua en el interior de las proteínas.',
    explanation: [
      '«No polar» describe cómo se reparten los electrones. El carbono y el hidrógeno los atraen casi con la misma fuerza, así que en una cadena hecha de enlaces C–C y C–H no quedan zonas con carga parcial. Sin esas cargas la cadena no puede formar puentes de hidrógeno con el agua, y el agua la empuja a juntarse con otras cadenas parecidas: es el efecto hidrofóbico que mantiene unido el interior de las proteínas.',
      '«Alifático» viene del griego «áleiphar», grasa o aceite. Se usa para las cadenas de carbono que no forman un anillo aromático, sean lineales, ramificadas o cíclicas, como las de las grasas.',
      'Tres miembros son casos límite. La glicina solo tiene un hidrógeno como cadena lateral, demasiado poco para ser de verdad hidrofóbica. La prolina es alifática pero cierra un anillo con su propio nitrógeno. Y la metionina lleva un azufre, aunque en forma de tioéter (C–S–C), que es poco polar.',
    ],
  },
  aromatic: {
    label: 'Aromáticos',
    cssVar: '--group-aromatic',
    description:
      'Llevan un anillo aromático voluminoso; absorben luz ultravioleta y participan en interacciones hidrofóbicas y de apilamiento.',
    explanation: [
      'En química, «aromático» no habla del olor sino de un tipo de anillo: plano, con enlaces dobles alternados cuyos electrones no pertenecen a un enlace concreto, sino que circulan por todo el anillo. El nombre es histórico, porque los primeros compuestos de este tipo que se conocieron eran olorosos.',
      'Los tres llevan un anillo así: benceno en la fenilalanina, fenol (benceno con un –OH) en la tirosina e indol (dos anillos fusionados, uno con nitrógeno) en el triptófano. Esos electrones compartidos absorben luz ultravioleta, y por eso la absorbancia a 280 nm, debida sobre todo al triptófano y la tirosina, sirve para medir cuánta proteína hay en una muestra.',
      'No son igual de hidrofóbicos: la fenilalanina es totalmente apolar, mientras que el –OH de la tirosina y el N–H del triptófano pueden formar puentes de hidrógeno.',
    ],
  },
  polar: {
    label: 'Polares sin carga',
    cssVar: '--group-polar',
    description:
      'Tienen grupos –OH, –SH o amida que forman puentes de hidrógeno con el agua, pero no ganan ni pierden carga a pH fisiológico.',
    explanation: [
      '«Polares» porque su cadena lateral tiene enlaces entre átomos que atraen a los electrones con distinta fuerza (O–H, N–H, C=O). En cada uno de esos enlaces queda un extremo ligeramente negativo y otro ligeramente positivo, y esas cargas parciales forman puentes de hidrógeno con el agua.',
      '«Sin carga» porque, a pH 7, ninguno gana ni pierde un protón: la carga es solo parcial, nunca una carga completa. Los –OH de la serina y la treonina y las amidas de la asparagina y la glutamina prácticamente no se ionizan en el agua.',
      'La cisteína es el caso límite: su tiol (–SH) sí puede perder el protón, pero su pKa está por encima de 8, así que a pH 7 la mayor parte sigue protonada. Además, el enlace S–H es mucho menos polar que el O–H, y por eso la cisteína es la menos hidrofílica del grupo.',
    ],
  },
  positive: {
    label: 'Cargados positivamente',
    cssVar: '--group-positive',
    description:
      'Su cadena lateral lleva un nitrógeno básico que capta un protón; son los aminoácidos básicos.',
    explanation: [
      'Se llaman así por la carga que lleva su cadena lateral a pH 7: un nitrógeno ha captado un protón (H⁺) y el grupo queda con una carga positiva completa. También se les dice «básicos», porque aceptar protones es justo lo que define a una base.',
      'La lisina y la arginina tienen un pKa muy por encima de 7, de modo que están protonadas prácticamente siempre. En la arginina la carga se reparte entre los tres nitrógenos del grupo guanidino, lo que la hace especialmente estable.',
      'La histidina es distinta: el pKa de su anillo de imidazol está cerca de 6, así que a pH 7 solo alrededor de una de cada diez moléculas lleva la carga. Se incluye en este grupo porque es la única cadena lateral que gana y pierde su protón cerca del pH fisiológico, una propiedad que las enzimas aprovechan.',
      'En AminoLab las estructuras se dibujan en su forma neutra; la carga se muestra aparte, con el color «carga a pH 7» y la nube de carga.',
    ],
  },
  negative: {
    label: 'Cargados negativamente',
    cssVar: '--group-negative',
    description:
      'Su cadena lateral termina en un carboxilo que cede su protón a pH 7; son los aminoácidos ácidos.',
    explanation: [
      'Se llaman así por la carga que lleva su cadena lateral a pH 7: el carboxilo (–COOH) ha cedido su protón y queda como carboxilato (–COO⁻), con una carga negativa completa repartida entre sus dos oxígenos. También se les dice «ácidos», porque ceder protones es lo que define a un ácido.',
      'El pKa de esos carboxilos está cerca de 4, tres unidades por debajo de 7, así que a pH fisiológico están desprotonados casi por completo. Por eso es habitual nombrarlos en su forma ionizada: aspartato y glutamato.',
      'La única diferencia entre ambos es un grupo CH₂ más en el glutámico, que aleja la carga del esqueleto y hace la cadena más flexible.',
      'En AminoLab las estructuras se dibujan en su forma neutra; la carga se muestra aparte, con el color «carga a pH 7» y la nube de carga.',
    ],
  },
}

export const ESSENTIALITY_LABELS: Record<Essentiality, string> = {
  essential: 'Esencial',
  conditional: 'Condicionalmente esencial',
  nonessential: 'No esencial',
}

/** Escala de Kyte-Doolittle: extremos usados en barras y gradientes. */
export const HYDROPATHY_RANGE = { min: -4.5, max: 4.5 }

/** Átomos del esqueleto (nombres CCD) de un aminoácido libre; sus hidrógenos se deducen por enlace. */
export const BACKBONE_ATOMS = ['N', 'CA', 'C', 'O', 'OXT']

interface SideChainIonization {
  type: 'acid' | 'base'
  atoms: string[]
}

type AminoAcidInput = Omit<AminoAcid, 'standard' | 'ionizableGroups'> & {
  sideChainIonization?: SideChainIonization
}

/** Completa `standard` e `ionizableGroups` a partir de los pKa, para no escribirlos dos veces. */
function define({ sideChainIonization, ...input }: AminoAcidInput): AminoAcid {
  const ionizableGroups: IonizableGroup[] = [
    { kind: 'alpha-carboxyl', pKa: input.pKa.carboxyl, type: 'acid', atoms: ['O', 'OXT'] },
    { kind: 'alpha-amino', pKa: input.pKa.amino, type: 'base', atoms: ['N'] },
  ]
  if (sideChainIonization && input.pKa.sideChain !== undefined) {
    ionizableGroups.push({ kind: 'side-chain', pKa: input.pKa.sideChain, ...sideChainIonization })
  }
  return { ...input, standard: true, ionizableGroups }
}

export const AMINO_ACIDS: AminoAcid[] = [
  // --- No polares alifáticos ---
  define({
    code3: 'Gly',
    code1: 'G',
    name: 'Glicina',
    aliases: ['glicocola'],
    group: 'nonpolar',
    smiles: 'NCC(=O)O',
    molecularWeight: 75,
    pKa: { carboxyl: 2.34, amino: 9.6 },
    pI: 5.97,
    hydropathy: -0.4,
    essentiality: 'conditional',
    codons: ['GGU', 'GGC', 'GGA', 'GGG'],
    note: 'El más pequeño: su cadena lateral es un solo hidrógeno, así que no es quiral y cabe donde ningún otro puede.',
  }),
  define({
    code3: 'Ala',
    code1: 'A',
    name: 'Alanina',
    aliases: [],
    group: 'nonpolar',
    smiles: 'N[C@@H](C)C(=O)O',
    molecularWeight: 89,
    pKa: { carboxyl: 2.34, amino: 9.69 },
    pI: 6.01,
    hydropathy: 1.8,
    essentiality: 'nonessential',
    codons: ['GCU', 'GCC', 'GCA', 'GCG'],
    note: 'Un simple metilo como cadena lateral: el aminoácido quiral más sencillo y muy frecuente en hélices α.',
  }),
  define({
    code3: 'Pro',
    code1: 'P',
    name: 'Prolina',
    aliases: [],
    group: 'nonpolar',
    smiles: 'OC(=O)[C@@H]1CCCN1',
    molecularWeight: 115,
    pKa: { carboxyl: 1.99, amino: 10.96 },
    pI: 6.48,
    hydropathy: -1.6,
    essentiality: 'conditional',
    codons: ['CCU', 'CCC', 'CCA', 'CCG'],
    note: 'Su cadena lateral se cierra sobre el nitrógeno α formando un anillo: es una amina secundaria y vuelve rígida la cadena.',
  }),
  define({
    code3: 'Val',
    code1: 'V',
    name: 'Valina',
    aliases: [],
    group: 'nonpolar',
    smiles: 'N[C@@H](C(C)C)C(=O)O',
    molecularWeight: 117,
    pKa: { carboxyl: 2.32, amino: 9.62 },
    pI: 5.97,
    hydropathy: 4.2,
    essentiality: 'essential',
    codons: ['GUU', 'GUC', 'GUA', 'GUG'],
    note: 'Cadena ramificada en forma de V justo en el carbono β; muy hidrofóbica y habitual en láminas β.',
  }),
  define({
    code3: 'Leu',
    code1: 'L',
    name: 'Leucina',
    aliases: [],
    group: 'nonpolar',
    smiles: 'N[C@@H](CC(C)C)C(=O)O',
    molecularWeight: 131,
    pKa: { carboxyl: 2.36, amino: 9.6 },
    pI: 5.98,
    hydropathy: 3.8,
    essentiality: 'essential',
    codons: ['UUA', 'UUG', 'CUU', 'CUC', 'CUA', 'CUG'],
    note: 'Como la valina pero con un carbono más antes de la ramificación; llena los núcleos hidrofóbicos de las proteínas.',
  }),
  define({
    code3: 'Ile',
    code1: 'I',
    name: 'Isoleucina',
    aliases: [],
    group: 'nonpolar',
    smiles: 'N[C@@H]([C@@H](C)CC)C(=O)O',
    molecularWeight: 131,
    pKa: { carboxyl: 2.36, amino: 9.68 },
    pI: 6.02,
    hydropathy: 4.5,
    essentiality: 'essential',
    codons: ['AUU', 'AUC', 'AUA'],
    note: 'Isómero de la leucina con la ramificación en el carbono β, que es un segundo centro quiral; el más hidrofóbico de la escala.',
  }),
  define({
    code3: 'Met',
    code1: 'M',
    name: 'Metionina',
    aliases: [],
    group: 'nonpolar',
    smiles: 'N[C@@H](CCSC)C(=O)O',
    molecularWeight: 149,
    pKa: { carboxyl: 2.28, amino: 9.21 },
    pI: 5.74,
    hydropathy: 1.9,
    essentiality: 'essential',
    codons: ['AUG'],
    note: 'Lleva un azufre en forma de tioéter, poco reactivo; su único codón, AUG, es también la señal de inicio de la traducción.',
  }),

  // --- Aromáticos ---
  define({
    code3: 'Phe',
    code1: 'F',
    name: 'Fenilalanina',
    aliases: [],
    group: 'aromatic',
    smiles: 'N[C@@H](Cc1ccccc1)C(=O)O',
    molecularWeight: 165,
    pKa: { carboxyl: 1.83, amino: 9.13 },
    pI: 5.48,
    hydropathy: 2.8,
    essentiality: 'essential',
    codons: ['UUU', 'UUC'],
    note: 'Una alanina con un anillo de benceno: aromático y totalmente apolar.',
  }),
  define({
    code3: 'Tyr',
    code1: 'Y',
    name: 'Tirosina',
    aliases: [],
    group: 'aromatic',
    smiles: 'N[C@@H](Cc1ccc(O)cc1)C(=O)O',
    molecularWeight: 181,
    pKa: { carboxyl: 2.2, amino: 9.11, sideChain: 10.07 },
    pI: 5.66,
    hydropathy: -1.3,
    essentiality: 'conditional',
    codons: ['UAU', 'UAC'],
    note: 'Fenilalanina con un –OH en el anillo: ese fenol forma puentes de hidrógeno y puede fosforilarse.',
    sideChainIonization: { type: 'acid', atoms: ['OH'] },
  }),
  define({
    code3: 'Trp',
    code1: 'W',
    name: 'Triptófano',
    aliases: ['triptofano'],
    group: 'aromatic',
    smiles: 'N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O',
    molecularWeight: 204,
    pKa: { carboxyl: 2.38, amino: 9.39 },
    pI: 5.89,
    hydropathy: -0.9,
    essentiality: 'essential',
    codons: ['UGG'],
    note: 'El más grande: su doble anillo de indol es el que más luz ultravioleta absorbe a 280 nm.',
  }),

  // --- Polares sin carga ---
  define({
    code3: 'Ser',
    code1: 'S',
    name: 'Serina',
    aliases: [],
    group: 'polar',
    smiles: 'N[C@@H](CO)C(=O)O',
    molecularWeight: 105,
    pKa: { carboxyl: 2.21, amino: 9.15 },
    pI: 5.68,
    hydropathy: -0.8,
    essentiality: 'nonessential',
    codons: ['UCU', 'UCC', 'UCA', 'UCG', 'AGU', 'AGC'],
    note: 'Una alanina con un –OH: pequeño, polar y blanco frecuente de fosforilación.',
  }),
  define({
    code3: 'Thr',
    code1: 'T',
    name: 'Treonina',
    aliases: [],
    group: 'polar',
    smiles: 'N[C@@H]([C@H](O)C)C(=O)O',
    molecularWeight: 119,
    pKa: { carboxyl: 2.11, amino: 9.62 },
    pI: 5.87,
    hydropathy: -0.7,
    essentiality: 'essential',
    codons: ['ACU', 'ACC', 'ACA', 'ACG'],
    note: 'Como la serina pero con un metilo extra en el carbono β, que se vuelve un segundo centro quiral.',
  }),
  define({
    code3: 'Cys',
    code1: 'C',
    name: 'Cisteína',
    aliases: ['cisteina'],
    group: 'polar',
    smiles: 'N[C@@H](CS)C(=O)O',
    molecularWeight: 121,
    pKa: { carboxyl: 1.96, amino: 10.28, sideChain: 8.18 },
    pI: 5.07,
    hydropathy: 2.5,
    essentiality: 'conditional',
    codons: ['UGU', 'UGC'],
    note: 'Su grupo tiol (–SH) puede oxidarse con el de otra cisteína y formar un puente disulfuro que une dos partes de la proteína.',
    sideChainIonization: { type: 'acid', atoms: ['SG'] },
  }),
  define({
    code3: 'Asn',
    code1: 'N',
    name: 'Asparagina',
    aliases: [],
    group: 'polar',
    smiles: 'N[C@@H](CC(N)=O)C(=O)O',
    molecularWeight: 132,
    pKa: { carboxyl: 2.02, amino: 8.8 },
    pI: 5.41,
    hydropathy: -3.5,
    essentiality: 'nonessential',
    codons: ['AAU', 'AAC'],
    note: 'La amida del ácido aspártico: sin carga, pero dona y acepta puentes de hidrógeno.',
  }),
  define({
    code3: 'Gln',
    code1: 'Q',
    name: 'Glutamina',
    aliases: [],
    group: 'polar',
    smiles: 'N[C@@H](CCC(N)=O)C(=O)O',
    molecularWeight: 146,
    pKa: { carboxyl: 2.17, amino: 9.13 },
    pI: 5.65,
    hydropathy: -3.5,
    essentiality: 'conditional',
    codons: ['CAA', 'CAG'],
    note: 'La amida del ácido glutámico: igual que la asparagina, con un carbono más de largo.',
  }),

  // --- Cargados positivamente ---
  define({
    code3: 'Lys',
    code1: 'K',
    name: 'Lisina',
    aliases: [],
    group: 'positive',
    smiles: 'N[C@@H](CCCCN)C(=O)O',
    molecularWeight: 146,
    pKa: { carboxyl: 2.18, amino: 8.95, sideChain: 10.53 },
    pI: 9.74,
    hydropathy: -3.9,
    essentiality: 'essential',
    codons: ['AAA', 'AAG'],
    note: 'Una cadena larga y flexible de cuatro carbonos que termina en una amina, protonada a pH 7.',
    sideChainIonization: { type: 'base', atoms: ['NZ'] },
  }),
  define({
    code3: 'Arg',
    code1: 'R',
    name: 'Arginina',
    aliases: [],
    group: 'positive',
    smiles: 'N[C@@H](CCCNC(N)=N)C(=O)O',
    molecularWeight: 174,
    pKa: { carboxyl: 2.17, amino: 9.04, sideChain: 12.48 },
    pI: 10.76,
    hydropathy: -4.5,
    essentiality: 'conditional',
    codons: ['CGU', 'CGC', 'CGA', 'CGG', 'AGA', 'AGG'],
    note: 'Su grupo guanidino reparte la carga positiva entre tres nitrógenos; es el más básico y el más hidrofílico de la escala.',
    sideChainIonization: { type: 'base', atoms: ['NE', 'NH1', 'NH2'] },
  }),
  define({
    code3: 'His',
    code1: 'H',
    name: 'Histidina',
    aliases: [],
    group: 'positive',
    smiles: 'N[C@@H](Cc1c[nH]cn1)C(=O)O',
    molecularWeight: 155,
    pKa: { carboxyl: 1.82, amino: 9.17, sideChain: 6.0 },
    pI: 7.59,
    hydropathy: -3.2,
    essentiality: 'essential',
    codons: ['CAU', 'CAC'],
    note: 'Su anillo de imidazol tiene un pKa cercano a 7: gana y cede protones con facilidad, por eso abunda en sitios activos.',
    sideChainIonization: { type: 'base', atoms: ['ND1', 'NE2'] },
  }),

  // --- Cargados negativamente ---
  define({
    code3: 'Asp',
    code1: 'D',
    name: 'Ácido aspártico',
    aliases: ['aspartato'],
    group: 'negative',
    smiles: 'N[C@@H](CC(=O)O)C(=O)O',
    molecularWeight: 133,
    pKa: { carboxyl: 1.88, amino: 9.6, sideChain: 3.65 },
    pI: 2.77,
    hydropathy: -3.5,
    essentiality: 'nonessential',
    codons: ['GAU', 'GAC'],
    note: 'Un segundo carboxilo a un solo carbono del esqueleto: desprotonado y negativo a pH 7.',
    sideChainIonization: { type: 'acid', atoms: ['OD1', 'OD2'] },
  }),
  define({
    code3: 'Glu',
    code1: 'E',
    name: 'Ácido glutámico',
    aliases: ['glutamato'],
    group: 'negative',
    smiles: 'N[C@@H](CCC(=O)O)C(=O)O',
    molecularWeight: 147,
    pKa: { carboxyl: 2.19, amino: 9.67, sideChain: 4.25 },
    pI: 3.22,
    hydropathy: -3.5,
    essentiality: 'nonessential',
    codons: ['GAA', 'GAG'],
    note: 'Como el aspártico con un carbono más; en su forma glutamato es además un neurotransmisor.',
    sideChainIonization: { type: 'acid', atoms: ['OE1', 'OE2'] },
  }),
]

/** Código CCD (y nombre del archivo SDF) de un aminoácido. */
export function ccdCode(aminoAcid: AminoAcid): string {
  return aminoAcid.code3.toUpperCase()
}

export function findAminoAcid(code: string): AminoAcid | undefined {
  const upper = code.toUpperCase()
  return AMINO_ACIDS.find((aa) => aa.code1 === upper || ccdCode(aa) === upper)
}
