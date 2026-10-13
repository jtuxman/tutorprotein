# `src/data/` — fuente única de datos

Aquí viven **todos** los datos bioquímicos y didácticos de AminoLab; el resto del código solo los importa.

## `aminoacids.ts`

Los 20 aminoácidos estándar. Fuente de los valores numéricos: Lehninger, 8.ª ed., Tabla 3-1 (anotada al inicio del archivo).

| Exporta | Qué es |
| --- | --- |
| `AMINO_ACIDS: AminoAcid[]` | Los 20, ordenados por grupo de Lehninger. |
| `AminoAcid` | `code3`, `code1`, `name`, `aliases`, `group`, `smiles` (neutro, isomérico), `molecularWeight` (Mr), `pKa { carboxyl, amino, sideChain? }`, `pI`, `hydropathy` (Kyte-Doolittle), `essentiality`, `codons` (ARN), `standard`, `note`, `ionizableGroups`. |
| `IonizableGroup` | `kind`, `pKa`, `type` (`'acid'` o `'base'`) y `atoms` (nombres CCD entre los que se reparte la carga). Se generan a partir de `pKa`; no se escriben dos veces. |
| `GROUPS`, `GROUP_ORDER` | Etiqueta, variable CSS de color, criterio (`description`) y explicación de por qué se llama así (`explanation`, en párrafos) de cada grupo de Lehninger. |
| `ESSENTIALITY_LABELS` | Texto de los tres estados: `essential`, `conditional`, `nonessential`. |
| `HYDROPATHY_RANGE`, `BACKBONE_ATOMS` | Extremos de la escala (−4.5…+4.5) y átomos del esqueleto (N, CA, C, O, OXT). |
| `ccdCode(aa)`, `findAminoAcid(code)` | Código CCD (`'ALA'`) y búsqueda por código de 1 o 3 letras. |

Las estructuras 3D están en `public/structures/{CCD}.sdf` (forma neutra) con `atom-names.json`; se regeneran con `node scripts/fetch-structures.mjs`.

## Más adelante
`trivia.ts` (mnemotecnias), `words.ts` (ahorcado), `tours/` (recorridos guiados).

## Reglas
- Ningún otro archivo escribe datos bioquímicos a mano. Las fórmulas viven en `src/chem/` (carga, geometría, lectura de SMILES) y no contienen datos.
- Si un valor es dudoso se marca `// TODO verificar`.
- Las pruebas de `aminoacids.test.ts` comprueban que cada SMILES, su SDF, su masa y su pI son coherentes entre sí.
