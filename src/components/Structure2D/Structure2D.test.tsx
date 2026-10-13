import { render, screen } from '@testing-library/react'
import { Structure2D } from './Structure2D'

const { draw } = vi.hoisted(() => ({ draw: vi.fn() }))

vi.mock('smiles-drawer', () => ({
  default: {
    Parser: {
      parse: (smiles: string) => {
        if (smiles === 'no-es-smiles') throw new Error('SMILES inválido')
        return { smiles }
      },
    },
    SvgDrawer: class {
      draw(tree: { smiles: string }) {
        draw(tree.smiles)
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('data-smiles', tree.smiles)
        return svg
      }
    },
  },
}))

describe('Structure2D', () => {
  it('dibuja el SVG con su texto alternativo', () => {
    render(<Structure2D smiles="NCC(=O)O" ariaLabel="Estructura 2D de Glicina" />)
    const figure = screen.getByRole('img', { name: 'Estructura 2D de Glicina' })
    expect(figure.querySelector('svg')).toHaveAttribute('data-smiles', 'NCC(=O)O')
  })

  it('no revela el nombre si no se le pasa', () => {
    render(<Structure2D smiles="NCC(=O)O" />)
    expect(screen.getByRole('img', { name: 'Estructura 2D' })).toBeInTheDocument()
  })

  it('reutiliza el dibujo de un mismo SMILES', () => {
    draw.mockClear()
    render(
      <>
        <Structure2D smiles="N[C@@H](C)C(=O)O" />
        <Structure2D smiles="N[C@@H](C)C(=O)O" />
      </>,
    )
    expect(draw).toHaveBeenCalledTimes(1)
  })

  it('muestra un aviso legible si SmilesDrawer falla', () => {
    render(<Structure2D smiles="no-es-smiles" />)
    expect(screen.getByText('No se pudo dibujar la estructura')).toBeInTheDocument()
  })
})
