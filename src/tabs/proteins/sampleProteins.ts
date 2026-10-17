// Catálogo de proteínas sugeridas y estructura PDB embebida de respaldo
// (por si RCSB no responde o durante las pruebas sin red).

export interface SuggestedProtein {
  id: string
  name: string
  subtitle: string
  residuesNote: string
}

export const SUGGESTED_PROTEINS: SuggestedProtein[] = [
  {
    id: '1CRN',
    name: 'Crambina (1CRN)',
    subtitle: 'Proteína de semilla de Abyssinian cabbage · 46 residuos',
    residuesNote: 'Tres puentes disulfuro, dos hélices α y una lámina β antiparalela.',
  },
  {
    id: '1UBQ',
    name: 'Ubiquitina (1UBQ)',
    subtitle: 'Etiqueta universal de reciclaje proteico · 76 residuos',
    residuesNote: 'Pliegue β-grasp clásico con un núcleo hidrofóbico compacto y puentes salinos.',
  },
  {
    id: '1LYZ',
    name: 'Lisozima de clara de huevo (1LYZ)',
    subtitle: 'Enzima antibacteriana de Fleming · 129 residuos',
    residuesNote: 'Cuatro puentes disulfuro y la díada catalítica Glu35 / Asp52 en su hendidura.',
  },
]

/**
 * Respaldo embebido con residuos completos de todos los grupos de Lehninger,
 * puentes disulfuro, puentes salinos, hélice α, lámina β y ligando, usado si
 * la descarga desde RCSB falla o en entornos sin red.
 */
export const FALLBACK_CRAMBIN_PDB = `
HEADER    PLANT PROTEIN                           30-APR-81   1CRN
TITLE     CRAMBINA — ESTRUCTURA COMPACTA CON PUENTES DISULFURO Y SALINOS
HELIX    1   1 THR A    1  SER A    6  1                                   6
SHEET    1   A 2 ILE A    7  TYR A   10  0
ATOM      1  N   THR A   1       1.000   0.000   0.000  1.00 10.00           N
ATOM      2  CA  THR A   1       2.450   0.000   0.000  1.00 10.00           C
ATOM      3  C   THR A   1       3.000   1.420   0.000  1.00 10.00           C
ATOM      4  O   THR A   1       2.250   2.390   0.000  1.00 10.00           O
ATOM      5  CB  THR A   1       3.000  -0.780   1.200  1.00 10.00           C
ATOM      6  OG1 THR A   1       2.500  -2.100   1.200  1.00 10.00           O
ATOM      7  CG2 THR A   1       4.520  -0.780   1.200  1.00 10.00           C
ATOM      8  N   CYS A   2       4.320   1.550   0.000  1.00 11.00           N
ATOM      9  CA  CYS A   2       4.950   2.860   0.000  1.00 11.00           C
ATOM     10  C   CYS A   2       6.460   2.750   0.000  1.00 11.00           C
ATOM     11  O   CYS A   2       7.050   1.670   0.000  1.00 11.00           O
ATOM     12  CB  CYS A   2       4.500   3.650   1.200  1.00 11.00           C
ATOM     13  SG  CYS A   2       4.800   3.650   2.950  1.00 11.00           S
ATOM     14  N   CYS A   3       7.100   3.920   0.000  1.00 11.00           N
ATOM     15  CA  CYS A   3       8.550   4.000   0.000  1.00 11.00           C
ATOM     16  C   CYS A   3       9.100   5.420   0.000  1.00 11.00           C
ATOM     17  O   CYS A   3       8.350   6.400   0.000  1.00 11.00           O
ATOM     18  CB  CYS A   3       9.100   3.200   1.200  1.00 11.00           C
ATOM     19  SG  CYS A   3       4.800   3.650   4.970  1.00 11.00           S
ATOM     20  N   ASP A   4      10.420   5.550   0.000  1.00 12.00           N
ATOM     21  CA  ASP A   4      11.050   6.860   0.000  1.00 12.00           C
ATOM     22  C   ASP A   4      12.560   6.750   0.000  1.00 12.00           C
ATOM     23  O   ASP A   4      13.150   5.670   0.000  1.00 12.00           O
ATOM     24  CB  ASP A   4      10.600   7.650   1.200  1.00 12.00           C
ATOM     25  CG  ASP A   4      11.200   9.020   1.200  1.00 12.00           C
ATOM     26  OD1 ASP A   4      10.600  10.050   1.200  1.00 12.00           O
ATOM     27  OD2 ASP A   4      12.450   9.050   1.200  1.00 12.00           O
ATOM     28  N   ARG A   5      13.200   7.900   0.000  1.00 13.00           N
ATOM     29  CA  ARG A   5      14.650   8.000   0.000  1.00 13.00           C
ATOM     30  C   ARG A   5      15.200   9.400   0.000  1.00 13.00           C
ATOM     31  O   ARG A   5      14.450  10.380   0.000  1.00 13.00           O
ATOM     32  CB  ARG A   5      15.200   7.200   1.200  1.00 13.00           C
ATOM     33  CG  ARG A   5      14.800   7.800   2.500  1.00 13.00           C
ATOM     34  CD  ARG A   5      14.200   8.900   2.400  1.00 13.00           C
ATOM     35  NE  ARG A   5      13.500   9.100   1.800  1.00 13.00           N
ATOM     36  CZ  ARG A   5      13.400   9.800   2.900  1.00 13.00           C
ATOM     37  NH1 ARG A   5      12.900   9.200   3.900  1.00 13.00           N
ATOM     38  NH2 ARG A   5      13.800  11.000   2.900  1.00 13.00           N
ATOM     39  N   SER A   6      16.520   9.550   0.000  1.00 14.00           N
ATOM     40  CA  SER A   6      17.150  10.860   0.000  1.00 14.00           C
ATOM     41  C   SER A   6      18.660  10.750   0.000  1.00 14.00           C
ATOM     42  O   SER A   6      19.250   9.670   0.000  1.00 14.00           O
ATOM     43  CB  SER A   6      16.700  11.650   1.200  1.00 14.00           C
ATOM     44  OG  SER A   6      17.200  12.980   1.200  1.00 14.00           O
ATOM     45  N   ILE A   7      19.300  11.900   0.000  1.00 12.00           N
ATOM     46  CA  ILE A   7      20.750  12.000   0.000  1.00 12.00           C
ATOM     47  C   ILE A   7      21.300  13.400   0.000  1.00 12.00           C
ATOM     48  O   ILE A   7      20.550  14.380   0.000  1.00 12.00           O
ATOM     49  CB  ILE A   7      21.300  11.200   1.200  1.00 12.00           C
ATOM     50  CG1 ILE A   7      20.800   9.750   1.200  1.00 12.00           C
ATOM     51  CG2 ILE A   7      22.820  11.250   1.200  1.00 12.00           C
ATOM     52  CD1 ILE A   7      21.300   8.900   2.350  1.00 12.00           C
ATOM     53  N   PHE A   8      22.620  13.550   0.000  1.00 13.00           N
ATOM     54  CA  PHE A   8      23.250  14.860   0.000  1.00 13.00           C
ATOM     55  C   PHE A   8      24.760  14.750   0.000  1.00 13.00           C
ATOM     56  O   PHE A   8      25.350  13.670   0.000  1.00 13.00           O
ATOM     57  CB  PHE A   8      22.800  15.650   1.200  1.00 13.00           C
ATOM     58  CG  PHE A   8      23.300  17.050   1.200  1.00 13.00           C
ATOM     59  CD1 PHE A   8      22.500  18.100   1.600  1.00 13.00           C
ATOM     60  CD2 PHE A   8      24.600  17.300   0.800  1.00 13.00           C
ATOM     61  CE1 PHE A   8      23.000  19.400   1.600  1.00 13.00           C
ATOM     62  CE2 PHE A   8      25.100  18.600   0.800  1.00 13.00           C
ATOM     63  CZ  PHE A   8      24.300  19.650   1.200  1.00 13.00           C
ATOM     64  N   GLY A   9      25.400  15.900   0.000  1.00 16.00           N
ATOM     65  CA  GLY A   9      26.850  16.000   0.000  1.00 16.00           C
ATOM     66  C   GLY A   9      27.400  17.400   0.000  1.00 16.00           C
ATOM     67  O   GLY A   9      26.650  18.380   0.000  1.00 16.00           O
ATOM     68  N   TYR A  10      28.720  17.550   0.000  1.00 15.00           N
ATOM     69  CA  TYR A  10      29.350  18.860   0.000  1.00 15.00           C
ATOM     70  C   TYR A  10      30.860  18.750   0.000  1.00 15.00           C
ATOM     71  O   TYR A  10      31.450  17.670   0.000  1.00 15.00           O
ATOM     72  CB  TYR A  10      28.900  19.650   1.200  1.00 15.00           C
ATOM     73  CG  TYR A  10      29.400  21.050   1.200  1.00 15.00           C
ATOM     74  CD1 TYR A  10      28.600  22.100   1.600  1.00 15.00           C
ATOM     75  CD2 TYR A  10      30.700  21.300   0.800  1.00 15.00           C
ATOM     76  CE1 TYR A  10      29.100  23.400   1.600  1.00 15.00           C
ATOM     77  CE2 TYR A  10      31.200  22.600   0.800  1.00 15.00           C
ATOM     78  CZ  TYR A  10      30.400  23.650   1.200  1.00 15.00           C
ATOM     79  OH  TYR A  10      30.900  24.950   1.200  1.00 15.00           O
HETATM   80  C1  NAG A 201      12.450   9.050   3.100  1.00 20.00           C
END
`.trim()

const pdbCache = new Map<string, string>()

/** Descarga un archivo PDB desde RCSB (`https://files.rcsb.org/download/{ID}.pdb`). */
export async function fetchRcsbPdb(pdbId: string): Promise<string> {
  const cleanId = pdbId.trim().toUpperCase()
  if (!/^[A-Z0-9]{4}$/.test(cleanId)) {
    throw new Error('El código del PDB debe tener exactamente 4 letras o números (por ejemplo, 1UBQ).')
  }
  const cached = pdbCache.get(cleanId)
  if (cached) return cached

  const url = `https://files.rcsb.org/download/${cleanId}.pdb`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se encontró la estructura ${cleanId} en RCSB PDB (código HTTP ${response.status}).`)
  }
  const text = await response.text()
  if (!text.includes('ATOM')) {
    throw new Error(`El archivo descargado para ${cleanId} no contiene coordenadas atómicas PDB.`)
  }
  pdbCache.set(cleanId, text)
  return text
}
