# `src/data/` — fuente única de datos

Aquí viven **todos** los datos bioquímicos y didácticos de AminoLab; el resto del código solo los importa.

- `aminoacids.ts` (Fase 1): los 20 aminoácidos (nombres, códigos, grupo de Lehninger, SMILES neutro, masa, pKa, pI, hidropatía, codones, `standard`…). La fuente de cada valor numérico se anota en un comentario.
- Más adelante: `trivia.ts` (mnemotecnias), `words.ts` (ahorcado), `tours/` (recorridos guiados).

Reglas: ningún otro archivo escribe datos bioquímicos a mano; si un valor es dudoso se marca `// TODO verificar`.
