export type TabId =
  | 'classification'
  | 'self-assessment'
  | 'proteins'
  | 'structural-lab'
  | 'games'
  | 'progress'

export interface TabInfo {
  id: TabId
  label: string
  shortLabel: string
  icon: string
  description: string
  phase: number
}

export const TABS: TabInfo[] = [
  {
    id: 'classification',
    label: 'Clasificación',
    shortLabel: 'Clasificar',
    icon: '🧪',
    description: 'Los 20 aminoácidos y su química: pH, pI, constructor, mnemotecnias y mutaciones.',
    phase: 1,
  },
  {
    id: 'self-assessment',
    label: 'Autoevaluación',
    shortLabel: 'Quiz',
    icon: '🎯',
    description: 'Quizzes de estructuras 2D/3D y propiedades, con repaso espaciado.',
    phase: 3,
  },
  {
    id: 'proteins',
    label: 'Proteínas',
    shortLabel: 'Proteínas',
    icon: '🧬',
    description: 'Carga proteínas del PDB o AlphaFold, explóralas y pon a prueba tu ojo.',
    phase: 4,
  },
  {
    id: 'structural-lab',
    label: 'Laboratorio estructural',
    shortLabel: 'Lab',
    icon: '🔬',
    description: 'Ramachandran, ángulos φ/ψ/χ, rotámeros, choques y constructor de péptidos.',
    phase: 5,
  },
  {
    id: 'games',
    label: 'Juegos',
    shortLabel: 'Juegos',
    icon: '🎮',
    description: 'Ahorcado, arcade de invasores y memorama de aminoácidos.',
    phase: 7,
  },
  {
    id: 'progress',
    label: 'Mi progreso',
    shortLabel: 'Progreso',
    icon: '🏆',
    description: 'Mapa de dominio, niveles, insignias, modo examen y modo docente.',
    phase: 8,
  },
]
