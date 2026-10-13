import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AMINO_ACIDS } from '../../data/aminoacids'
import { parseSdfAtoms, readAtomNames, readStructure } from '../../test/structures'
import { MolViewer } from './MolViewer'
import { aminoAcidMolecule } from './structures'

const { viewer } = vi.hoisted(() => {
  const model = { selectedAtoms: vi.fn() }
  const viewer = {
    model,
    addModel: vi.fn(() => model),
    addLabel: vi.fn(),
    addSurface: vi.fn(() => Promise.resolve(1)),
    addSphere: vi.fn(),
    addCylinder: vi.fn(),
    setStyle: vi.fn(),
    setClickable: vi.fn(),
    removeAllModels: vi.fn(),
    removeAllSurfaces: vi.fn(),
    removeSurface: vi.fn(),
    removeAllLabels: vi.fn(),
    removeAllShapes: vi.fn(),
    zoomTo: vi.fn(),
    getView: vi.fn(() => [0, 0, 0, 0, 0, 0, 0, 1]),
    setView: vi.fn(),
    render: vi.fn(),
    resize: vi.fn(),
    clear: vi.fn(),
  }
  return { viewer }
})

vi.mock('./load3Dmol', () => ({
  load3Dmol: () => Promise.resolve({ createViewer: () => viewer }),
}))

const lys = AMINO_ACIDS.find((aa) => aa.code3 === 'Lys')!
const heavyAtoms = readAtomNames().LYS.filter((name) => !name.startsWith('H'))

beforeEach(() => {
  vi.clearAllMocks()
  viewer.model.selectedAtoms.mockImplementation(() =>
    parseSdfAtoms(readStructure('LYS')).map((atom, index) => ({ ...atom, elem: atom.element, index, bonds: [] })),
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('.json')
        ? new Response(JSON.stringify(readAtomNames()))
        : new Response(readStructure('LYS')),
    ),
  )
})

afterEach(() => vi.unstubAllGlobals())

const revealingOptions = () =>
  ['Grupo de Lehninger', 'Hidrofóbico / hidrofílico', 'Gradiente de Kyte-Doolittle', 'Polaridad y carga', 'Carga a pH 7'].map(
    (name) => screen.getByRole<HTMLOptionElement>('option', { name }),
  )

describe('MolViewer', () => {
  it('etiqueta los átomos pesados con su nombre del CCD', async () => {
    // Las etiquetas están activadas por defecto: no hace falta pasar `labels`.
    render(<MolViewer molecule={aminoAcidMolecule(lys)} colorMode="group" />)
    await waitFor(() => expect(viewer.addLabel).toHaveBeenCalledTimes(heavyAtoms.length))
    expect(viewer.addLabel.mock.calls.map(([text]) => text).sort()).toEqual([...heavyAtoms].sort())
    expect(screen.getByRole('img', { name: 'Visor 3D de Lisina' })).toBeInTheDocument()
    expect(screen.getByLabelText('Color')).toHaveValue('group')
    // Por defecto los hidrógenos están ocultos.
    expect(screen.getByRole('checkbox', { name: 'Mostrar hidrógenos' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Etiquetas' })).toBeChecked()
    expect(viewer.setStyle).toHaveBeenCalledWith({ elem: 'H' }, {})
    for (const option of revealingOptions()) expect(option.disabled).toBe(false)
  })

  it('con spoilerFree desactiva los modos reveladores y oculta etiquetas y nombre', async () => {
    render(<MolViewer molecule={aminoAcidMolecule(lys)} labels="atoms" colorMode="charge" surface="charge-cloud" spoilerFree />)
    await waitFor(() => expect(viewer.setStyle).toHaveBeenCalled())
    expect(screen.getByLabelText('Color')).toHaveValue('element')
    for (const option of revealingOptions()) expect(option.disabled).toBe(true)
    expect(screen.getByRole('checkbox', { name: 'Etiquetas' })).toBeDisabled()
    expect(viewer.addLabel).not.toHaveBeenCalled()
    expect(viewer.addSurface).not.toHaveBeenCalled()
    expect(screen.queryByText(/Lisina/)).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Visor 3D de la molécula' })).toBeInTheDocument()
  })

  it('mide la distancia entre dos átomos tocados', async () => {
    render(<MolViewer molecule={aminoAcidMolecule(lys)} />)
    await waitFor(() => expect(viewer.setClickable).toHaveBeenCalled())
    const pick = viewer.setClickable.mock.calls[0][2] as (atom: { index: number }) => void
    const names = readAtomNames().LYS

    fireEvent.change(screen.getByLabelText('Medir'), { target: { value: 'distance' } })
    expect(screen.getByRole('status')).toHaveTextContent('0 de 2')
    act(() => pick({ index: names.indexOf('CA') }))
    expect(screen.getByRole('status')).toHaveTextContent('1 de 2')
    act(() => pick({ index: names.indexOf('CB') }))

    await waitFor(() => expect(viewer.addCylinder).toHaveBeenCalledTimes(1))
    const texts = viewer.addLabel.mock.calls.map(([text]) => text as string)
    expect(texts.at(-1)).toMatch(/^1\.5\d Å$/)

    fireEvent.click(screen.getByRole('button', { name: /Borrar medidas/ }))
    expect(screen.queryByRole('button', { name: /Borrar medidas/ })).not.toBeInTheDocument()
  })
})
