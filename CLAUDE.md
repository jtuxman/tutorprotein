# AminoLab — guía para Claude Code

Web de aprendizaje de aminoácidos y proteínas con seis pestañas:
1. **Clasificación**: los 20 aminoácidos y su química (simulador de pH/pI, constructor, mnemotecnias, mutaciones).
2. **Autoevaluación**: quizzes 2D/3D y propiedades, con repaso espaciado.
3. **Proteínas**: cargar (PDB, archivo, AlphaFold), explorar, evaluar cadenas laterales, recorridos guiados, mutar.
4. **Laboratorio estructural**: Ramachandran, rotar φ/ψ/χ, rotámeros, choques, constructor de péptidos.
5. **Juegos**: ahorcado, arcade de invasores, memorama.
6. **Mi progreso**: mapa de dominio, niveles, modo examen, modo docente.

El plan maestro está en `docs/handoffs/2026-10-12-plan-inicial.md`. Cada fase llega con su propio handoff detallado. Los cambios decididos después se anotan en la sección "Cambios al plan" del plan maestro y en "Cambios posteriores" del handoff de la fase.

## Cómo trabajamos
- Las decisiones se toman en el chat web y llegan aquí como documentos en `docs/handoffs/`. Antes de empezar una tarea, lee el handoff más reciente.
- Si el handoff contradice el código o algo no está claro, **detente y pregunta**; no improvises decisiones de diseño.
- Commits pequeños, uno por tarea, con mensajes en español (`feat: pestaña de clasificación`, `fix: ...`).
- Al terminar un bloque de trabajo: corre `npm run build` y `npm test`, haz commit y push.
- Al cerrar cada handoff, añade al final del archivo una sección **"Resultado"** con lo hecho, lo pendiente y cualquier desviación del plan.

## Stack
- Vite + React + TypeScript.
- Visor 3D: **3Dmol.js** (aminoácidos individuales y proteínas).
- Estructuras 2D: **SmilesDrawer** a partir de SMILES.
- Sin backend: sitio estático, publicado en GitHub Pages.
- Progreso del usuario en `localStorage` (siempre envuelto en try/catch).

## Convenciones
- Interfaz en español; código e identificadores en inglés.
- Los datos de aminoácidos viven en un solo archivo: `src/data/aminoacids.ts`. Ninguna otra parte del código debe tener datos bioquímicos escritos a mano.
- Estructuras 3D de aminoácidos: archivos SDF "ideal" del Chemical Component Dictionary de RCSB, guardados en `public/structures/` (no descargarlos en tiempo de ejecución).
- Proteínas: se descargan de RCSB en tiempo de ejecución (`https://files.rcsb.org/download/{ID}.pdb`) o se suben como archivo `.pdb`.
- En modo quiz, nunca mostrar etiquetas, nombres ni colores que revelen la respuesta.
- **Todo visor 3D usa el componente compartido `MolViewer`** (`src/components/MolViewer/`). No crear visores sueltos: si una pestaña necesita una vista nueva (modo de color, superficie, interacción), se agrega al kit y queda disponible para todas.
- **Regla anti-spoiler**: durante una pregunta, desactivar los modos de color, etiquetas y nubes de carga que delaten la respuesta; reactivarlos al responder.
- **Valores por defecto de `MolViewer`**: hidrógenos ocultos y etiquetas de átomo activadas (bolas y varillas, color por elemento, sin superficie). No cambiarlos en una pestaña sin que lo pida su handoff; en quizzes manda la regla anti-spoiler.
- La nube de carga es un **potencial de Coulomb aproximado a pH 7**, calculado en un Web Worker. La interfaz debe indicar que es una aproximación educativa (no APBS).
- **Todo resultado de pregunta, quiz, juego o reto se registra en el motor de progreso** (`src/progress/`). No guardar progreso por separado en cada pestaña.
- **Choques estéricos**: solapamiento ≥ 0.4 Å respecto a la suma de radios de van der Waals entre átomos no enlazados (convención MolProbity).
- **Licencias de datos**: antes de incluir bibliotecas de rotámeros, contornos de Ramachandran o cualquier dataset externo, verifica que su licencia permita redistribuirlo y anótala en `docs/licencias.md`. No uses la biblioteca de Dunbrack.
- **Contenido didáctico original**: los textos de recorridos, mnemotecnias y explicaciones se escriben desde cero; no copiar de Proteopedia, PDB-101 ni libros.
- Estructuras 2D y 3D siempre en **forma neutra** (–NH2 / –COOH, cadenas laterales sin carga), no zwitteriónica. Las formas cargadas solo aparecen donde se enseña la protonación (simulador de pH). Los SDF del CCD de Lys, Arg e His vienen protonados y se neutralizan al generarlos.
- Estilo visual **atractivo y lúdico**: colores vivos por grupo, animaciones suaves, celebraciones al acertar, rachas e insignias. Sin sacrificar legibilidad de las estructuras.
- El modelo de datos incluye `standard: boolean` para poder añadir después aminoácidos no estándar (selenocisteína, pirrolisina).

## Exactitud bioquímica
- Clasificación de referencia: la de Lehninger (5 grupos).
- Si un valor numérico (pKa, hidropatía, masa) varía entre fuentes, usa una sola fuente consistente y anótala en un comentario del archivo de datos.
- No inventes datos: si no estás seguro de un valor, déjalo marcado con `// TODO verificar` y menciónalo en el "Resultado" del handoff.
