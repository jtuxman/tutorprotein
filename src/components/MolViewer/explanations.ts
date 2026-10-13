// Textos de "¿Qué estoy viendo?": 1–2 frases originales por opción del visor.
// Son textos de interfaz, no datos bioquímicos.

import type { ColorMode, Representation, SurfaceMode } from './types'

export interface Explanation {
  label: string
  text: string
}

export const REPRESENTATIONS: Record<Representation, Explanation> = {
  ballstick: {
    label: 'Bolas y varillas',
    text: 'Cada átomo es una bola y cada enlace una varilla. Es la vista más clara para contar átomos y seguir quién está unido a quién.',
  },
  sticks: {
    label: 'Varillas',
    text: 'Solo se dibujan los enlaces; los átomos son las esquinas y los extremos. Despeja la vista para fijarte en la forma del esqueleto.',
  },
  spheres: {
    label: 'Esferas (van der Waals)',
    text: 'Cada átomo ocupa su tamaño real aproximado. Así se ve cuánto espacio llena la molécula y por qué dos átomos no pueden encimarse.',
  },
  lines: {
    label: 'Líneas',
    text: 'La versión más ligera: enlaces como líneas finas. Útil para ver la superficie o las medidas sin que la molécula estorbe.',
  },
}

export const COLOR_MODES: Record<ColorMode, Explanation> = {
  element: {
    label: 'Elemento',
    text: 'Colores clásicos por elemento: carbono gris, hidrógeno blanco, nitrógeno azul, oxígeno rojo y azufre amarillo.',
  },
  group: {
    label: 'Grupo de Lehninger',
    text: 'La cadena lateral toma el color de su grupo y el esqueleto queda en gris: lo que cambia de un aminoácido a otro es solo la parte coloreada.',
  },
  hydrophobic: {
    label: 'Hidrofóbico / hidrofílico',
    text: 'Naranja si la cadena lateral rehúye el agua (índice de hidropatía mayor que cero) y azul verdoso si la prefiere.',
  },
  'kyte-doolittle': {
    label: 'Gradiente de Kyte-Doolittle',
    text: 'El mismo índice de hidropatía, pero como escala continua: cuanto más naranja, más hidrofóbica la cadena lateral; cuanto más azul verdoso, más hidrofílica.',
  },
  polarity: {
    label: 'Polaridad y carga',
    text: 'Cuatro clases: no polar, polar sin carga, con carga positiva y con carga negativa. Los aromáticos cuentan aquí como no polares, aunque la tirosina tiene un –OH capaz de formar puentes de hidrógeno.',
  },
  charge: {
    label: 'Carga a pH 7',
    text: 'Rojo donde habría carga negativa y azul donde habría carga positiva a pH 7; cuanto más intenso, más cerca de una carga completa. La estructura se dibuja neutra: el color solo indica qué grupos se ionizarían.',
  },
}

export const SURFACES: Record<SurfaceMode, Explanation> = {
  none: {
    label: 'Sin superficie',
    text: 'Solo la molécula, sin envoltura.',
  },
  'charge-cloud': {
    label: 'Nube de carga (pH 7)',
    text: 'La superficie de la molécula coloreada por el potencial eléctrico que crearían sus grupos ionizados a pH 7: rojo atrae cargas positivas, azul atrae negativas. Es una aproximación educativa, no un cálculo riguroso.',
  },
  hydrophobicity: {
    label: 'Superficie por hidrofobicidad',
    text: 'La superficie pintada átomo por átomo: naranja donde hay carbono, azufre y sus hidrógenos (apolar), azul verdoso donde hay nitrógeno, oxígeno y sus hidrógenos (polar). Muestra qué caras de la molécula toleran el agua.',
  },
}

export const TOOLS = {
  hydrogens: {
    label: 'Hidrógenos',
    text: 'Muestra u oculta los hidrógenos. Con ellos se ve que el amino (–NH2) y el carboxilo (–COOH) están dibujados sin carga; sin ellos la forma general se lee mejor.',
  },
  labels: {
    label: 'Etiquetas',
    text: 'Nombre de cada átomo pesado según la convención del PDB: CA es el carbono α, CB el β, y así siguiendo el alfabeto griego (G, D, E, Z, H) al alejarse del esqueleto.',
  },
  measure: {
    label: 'Medir',
    text: 'Toca átomos para medir: dos dan una distancia en ångströms, tres un ángulo y cuatro un ángulo diedro, el giro alrededor del enlace central.',
  },
  reset: {
    label: 'Centrar',
    text: 'Vuelve a encuadrar la molécula completa si la perdiste al girar o acercar.',
  },
  capture: {
    label: 'Captura',
    text: 'Descarga la vista actual como imagen PNG.',
  },
} satisfies Record<string, Explanation>

/** Avisos fijos que acompañan a las vistas de carga. */
export const NEUTRAL_STRUCTURE_NOTICE = 'La estructura se dibuja neutra; los colores indican la carga que tendría a pH 7.'
export const CHARGE_CLOUD_NOTICE =
  'Aproximación educativa (Coulomb a pH 7), no es un cálculo Poisson-Boltzmann (APBS).'
