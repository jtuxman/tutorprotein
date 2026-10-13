import { useMemo } from 'react'
import SmilesDrawer from 'smiles-drawer'
import './Structure2D.css'

export interface Structure2DProps {
  smiles: string
  /** Lado del recuadro en píxeles; sin él ocupa el ancho disponible. */
  size?: number
  /** Texto alternativo. Omitirlo en quizzes para no revelar el nombre. */
  ariaLabel?: string
}

// Lado del lienzo interno; el SVG resultante escala al tamaño pedido.
const CANVAS_SIZE = 300

const DRAWER_OPTIONS = {
  width: CANVAS_SIZE,
  height: CANVAS_SIZE,
  bondThickness: 1.6,
  padding: 14,
  themes: {
    aminolab: {
      FOREGROUND: '#2b2147',
      BACKGROUND: '#ffffff',
      C: '#2b2147',
      O: '#e11d48',
      N: '#2563eb',
      S: '#ca8a04',
      H: '#6b5f8a',
    },
  },
}

type Drawing = { svg: string } | { error: string }

// Las mismas 20 moléculas se dibujan muchas veces: se guarda el SVG por SMILES.
const cache = new Map<string, Drawing>()

function draw(smiles: string): Drawing {
  const cached = cache.get(smiles)
  if (cached) return cached
  let drawing: Drawing
  try {
    const tree = SmilesDrawer.Parser.parse(smiles)
    const svg = new SmilesDrawer.SvgDrawer(DRAWER_OPTIONS).draw(tree, null, 'aminolab')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.setAttribute('aria-hidden', 'true')
    drawing = { svg: svg.outerHTML }
  } catch (error) {
    drawing = { error: error instanceof Error ? error.message : String(error) }
  }
  cache.set(smiles, drawing)
  return drawing
}

export function Structure2D({ smiles, size, ariaLabel }: Structure2DProps) {
  const drawing = useMemo(() => draw(smiles), [smiles])
  const style = size ? { width: size, height: size } : undefined

  if ('error' in drawing) {
    return (
      <div className="structure-2d structure-2d--error" style={style} role="img" aria-label={ariaLabel ?? 'Estructura 2D no disponible'}>
        <span aria-hidden="true">⚠️</span>
        <span>No se pudo dibujar la estructura</span>
      </div>
    )
  }

  return (
    <div
      className="structure-2d"
      style={style}
      role="img"
      aria-label={ariaLabel ?? 'Estructura 2D'}
      dangerouslySetInnerHTML={{ __html: drawing.svg }}
    />
  )
}
