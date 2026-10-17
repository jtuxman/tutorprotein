import { eligibleQuizResidues, parsePdb } from './pdb'

const MINI_PDB = `
HEADER    PLANT PROTEIN                           01-JAN-20   1TST
TITLE     MINI ESTRUCTURA DE PRUEBA CON DISULFURO Y PUENTE SALINO
HELIX    1   1 CYS A    1  ASP A    4  1                                   4
ATOM      1  N   CYS A   1       0.000   0.000   0.000  1.00 10.00           N
ATOM      2  CA  CYS A   1       1.458   0.000   0.000  1.00 10.00           C
ATOM      3  C   CYS A   1       2.009   1.420   0.000  1.00 10.00           C
ATOM      4  O   CYS A   1       1.251   2.390   0.000  1.00 10.00           O
ATOM      5  CB  CYS A   1       1.980  -0.780   1.200  1.00 10.00           C
ATOM      6  SG  CYS A   1       3.780  -0.780   1.200  1.00 10.00           S
ATOM      7  N   CYS A   2       3.320   1.550   0.000  1.00 12.00           N
ATOM      8  CA  CYS A   2       3.950   2.860   0.000  1.00 12.00           C
ATOM      9  C   CYS A   2       5.460   2.750   0.000  1.00 12.00           C
ATOM     10  O   CYS A   2       6.050   1.670   0.000  1.00 12.00           O
ATOM     11  CB  CYS A   2       3.500   3.650   1.200  1.00 12.00           C
ATOM     12  SG  CYS A   2       3.780  -0.780   3.220  1.00 12.00           S
ATOM     13  N   ASP A   3       6.100   3.920   0.000  1.00 14.00           N
ATOM     14  CA  ASP A   3       7.550   4.000   0.000  1.00 14.00           C
ATOM     15  C   ASP A   3       8.100   5.420   0.000  1.00 14.00           C
ATOM     16  O   ASP A   3       7.350   6.400   0.000  1.00 14.00           O
ATOM     17  CB  ASP A   3       8.100   3.200   1.200  1.00 14.00           C
ATOM     18  CG  ASP A   3       9.600   3.200   1.200  1.00 14.00           C
ATOM     19  OD1 ASP A   3      10.200   2.100   1.200  1.00 14.00           O
ATOM     20  OD2 ASP A   3      10.200   4.300   1.200  1.00 14.00           O
ATOM     21  N   LYS A   4       9.420   5.550   0.000  1.00 15.00           N
ATOM     22  CA  LYS A   4      10.050   6.860   0.000  1.00 15.00           C
ATOM     23  C   LYS A   4      11.560   6.750   0.000  1.00 15.00           C
ATOM     24  O   LYS A   4      12.150   5.670   0.000  1.00 15.00           O
ATOM     25  CB  LYS A   4       9.600   7.650   1.200  1.00 15.00           C
ATOM     26  CG  LYS A   4      10.000   6.900   2.400  1.00 15.00           C
ATOM     27  CD  LYS A   4      10.100   5.500   2.200  1.00 15.00           C
ATOM     28  CE  LYS A   4      10.150   4.900   1.500  1.00 15.00           C
ATOM     29  NZ  LYS A   4      10.200   4.300   4.500  1.00 15.00           N
ATOM     30  N   PHE A   5      12.200   7.900   0.000  1.00 18.00           N
ATOM     31  CA  PHE A   5      13.650   8.000   0.000  1.00 18.00           C
ATOM     32  C   PHE A   5      14.200   9.400   0.000  1.00 18.00           C
ATOM     33  O   PHE A   5      13.450  10.350   0.000  1.00 18.00           O
ATOM     34  CB  PHE A   5      14.200   7.200   1.200  1.00 18.00           C
HETATM   35  C1  HEM A 101      10.200   4.300   2.500  1.00 20.00           C
END
`.trim()

describe('parsePdb', () => {
  it('extrae metadatos, detecta disulfuros, puentes salinos, ligandos y excluye cadenas laterales incompletas', () => {
    const parsed = parsePdb(MINI_PDB)
    expect(parsed.id).toBe('1TST')
    expect(parsed.title).toContain('Mini estructura')
    expect(parsed.chains).toEqual(['A'])
    expect(parsed.residues).toHaveLength(5)

    // Cys1 y Cys2 están a 2.02 Å entre sus átomos SG → puente disulfuro
    expect(parsed.disulfides).toHaveLength(1)
    expect(parsed.residues[0].disulfidePartner).toBe('A:2')

    // Asp3 (OD2) y Lys4 (NZ) están a 3.30 Å → puente salino
    expect(parsed.saltBridges).toHaveLength(1)
    expect(parsed.residues[2].saltBridgePartners).toContain('A:4')

    // Phe5 solo tiene CB (faltan CG, CD1, etc.), por lo que se excluye del quiz de cadenas laterales
    expect(parsed.residues[4].completeSideChain).toBe(false)
    const eligible = eligibleQuizResidues(parsed)
    expect(eligible.map((r) => r.resName)).toEqual(['CYS', 'CYS', 'ASP', 'LYS'])

    // Cercanía al ligando HEM
    expect(parsed.ligandNames).toEqual(['HEM'])
    expect(parsed.residues[2].nearLigand).toBe(true)
  })
})
