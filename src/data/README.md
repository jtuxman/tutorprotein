# `src/data/` — fuente única de datos

Aquí viven **todos** los datos bioquímicos y didácticos de AminoLab; el resto del código solo los importa.

- `aminoacids.ts` (Fase 1): los 20 aminoácidos (nombres, códigos, grupo de Lehninger, SMILES neutro, masa, pKa, pI, hidropatía, esencialidad, codones, `standard`, grupos ionizables y explicación de los grupos).
- `trivia.ts` (Fase 2): mnemotecnia original, etimología y aplicaciones en la vida real/clínica para cada aminoácido.
- `fragments.ts` (Fase 2): fragmentos químicos arrastrables y recetas de cadena lateral para el constructor 2D, validados contra el SMILES neutro.
- `blosum62.ts` (Fase 2): matriz de sustitución BLOSUM62, roles de puente de hidrógeno, análisis de mutaciones X → Y y casos clínicos precargados.
- Más adelante: `words.ts` (ahorcado), `tours/` (recorridos guiados).

Reglas: ningún otro archivo escribe datos bioquímicos a mano; si un valor es dudoso se marca `// TODO verificar`.
