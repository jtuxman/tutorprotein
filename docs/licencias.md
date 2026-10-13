# Licencias de bibliotecas y datos externos

Antes de incluir cualquier biblioteca o dataset externo se verifica que su licencia permita redistribuirlo y se anota aquí. No se usa la biblioteca de rotámeros de Dunbrack (su licencia restringe la redistribución).

| Recurso | Uso en AminoLab | Licencia | Verificado en |
| --- | --- | --- | --- |
| **3Dmol.js** 2.5.5 | Visor 3D (`MolViewer`) | BSD-3-Clause | Archivo `LICENSE` del paquete npm `3dmol` · https://github.com/3dmol/3Dmol.js/blob/master/LICENSE |
| **SmilesDrawer** 2.4.1 | Estructuras 2D a partir de SMILES | MIT | Archivo `LICENSE.md` del paquete npm `smiles-drawer` · https://github.com/reymond-group/smilesDrawer/blob/master/LICENSE.md |
| **Chemical Component Dictionary** (wwPDB) | Coordenadas ideales y nombres de átomo de los 20 aminoácidos (`public/structures/`) | CC0 1.0 Universal | https://www.wwpdb.org/about/usage-policies · https://www.rcsb.org/pages/usage-policy |
| **Lehninger Principles of Biochemistry**, 8.ª ed. (Nelson & Cox, 2021), Tabla 3-1 | Valores numéricos de `src/data/aminoacids.ts` (Mr, pKa, pI, índice de hidropatía) | Datos fácticos, citados; no se reproduce texto ni la tabla como tal | — |

Fecha de verificación: 2026-10-12.

## Notas

### 3Dmol.js
El archivo `LICENSE` indica que 3Dmol.js incorpora código de GLmol, Three.js y jQuery y que se distribuye bajo BSD-3-Clause. Cita recomendada por sus autores: Rego & Koes, *Bioinformatics* 31(8), 2015.

### Chemical Component Dictionary
- La política de uso de wwPDB dice que los archivos de datos del archivo PDB están bajo "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication" y anima a atribuir a los autores originales cuando sea posible. La página no nombra el CCD por separado; se aplica porque el CCD se distribuye como parte del archivo PDB (`files.wwpdb.org/pub/pdb/data/monomers/`).
- Los archivos se descargaron de `https://files.rcsb.org/ligands/view/{CCD}_ideal.sdf` (coordenadas ideales) y `https://files.rcsb.org/ligands/view/{CCD}.cif` (nombres de átomo) con `scripts/fetch-structures.mjs`.
- **Archivos modificados respecto al original**: `LYS.sdf`, `ARG.sdf` e `HIS.sdf` se neutralizaron (se quitó un hidrógeno del nitrógeno cargado de la cadena lateral y la carga formal). Los otros 17 se guardan sin cambios de contenido. `atom-names.json` es un derivado propio con los nombres de átomo del CIF.

### Valores de Lehninger
Los valores numéricos son hechos (constantes medidas), no texto protegido; se citan con su fuente en el comentario inicial de `src/data/aminoacids.ts`. El índice de hidropatía de esa tabla es la escala de Kyte & Doolittle, *J. Mol. Biol.* 157:105–132 (1982). Las notas y textos descriptivos de AminoLab son originales.
