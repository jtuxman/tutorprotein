import { render, screen, waitFor } from '@testing-library/react'
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
    render(<MolViewer molecule={aminoAcidMolecule(lys)} labels="atoms" colorMode="group" />)
    await waitFor(() => expect(viewer.addLabel).toHaveBeenCalledTimes(heavyAtoms.length))
    expect(viewer.addLabel.mock.calls.map(([text]) => text).sort()).toEqual([...heavyAtoms].sort())
    expect(screen.getByRole('img', { name: 'Visor 3D de Lisina' })).toBeInTheDocument()
    expect(screen.getByLabelText('Color')).toHaveValue('group')
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
})
