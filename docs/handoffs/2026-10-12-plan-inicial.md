# Handoff 2026-10-12 — Plan maestro de AminoLab

> Este es el **mapa general** del proyecto. Cada fase se ejecutará con su propio handoff detallado, generado en el chat web al terminar la fase anterior. En esta sesión, Claude Code ejecuta **solo la Fase 0** (ver instrucción al final).

## 1. Contexto
Proyecto nuevo, repositorio vacío. Objetivo: una web de aprendizaje, atractiva y lúdica, para dominar los aminoácidos (clasificación, química, estructuras 2D y 3D) y entender cómo se comportan dentro de proteínas reales: conformación, rotámeros, choques, interacciones y efecto de mutaciones.

## 2. Decisiones

### Producto
- **Seis pestañas**:
  1. **Clasificación**: explorar los 20 aminoácidos y su química (incluye simulador de pH, constructor, mnemotecnias, mutaciones).
  2. **Autoevaluación**: quizzes sobre propiedades y estructuras 2D/3D, con repaso espaciado.
  3. **Proteínas**: cargar proteínas (PDB, archivo o AlphaFold), explorarlas, evaluarme identificando cadenas laterales, recorridos guiados, mutar residuos.
  4. **Laboratorio estructural**: Ramachandran, rotar φ/ψ y χ (rotámeros), detectar choques y conformaciones prohibidas, constructor de péptidos.
  5. **Juegos**: ahorcado, arcade de invasores, memorama.
  6. **Mi progreso**: mapa de dominio, niveles, modo examen, modo docente.
- **Estilo atractivo y lúdico**: colores vivos por grupo, animaciones suaves, celebraciones al acertar, rachas e insignias. Sin sacrificar la legibilidad de las estructuras.
- **Estructuras 2D en forma neutra** (–NH2 / –COOH). La forma ionizada aparece solo donde enseña algo: simulador de pH y nube de carga (pH 7).
- **Clasificación de Lehninger**, 5 grupos:
  - No polares alifáticos: Gly, Ala, Pro, Val, Leu, Ile, Met
  - Aromáticos: Phe, Tyr, Trp
  - Polares sin carga: Ser, Thr, Cys, Asn, Gln
  - Cargados positivamente: Lys, Arg, His
  - Cargados negativamente: Asp, Glu
- **Aminoácidos no estándar** (selenocisteína, pirrolisina): después; el modelo de datos lleva `standard: boolean`.

### Técnicas
- **Stack**: Vite + React + TypeScript; 3Dmol.js para 3D; SmilesDrawer para 2D. Sitio estático en GitHub Pages, sin backend.
- **Una sola fuente de datos** (`src/data/`), que alimenta todas las pestañas.
- **Un visor 3D compartido (`MolViewer`)** tipo PyMOL, usado en todas las pestañas (ver "Kit de visualización").
- **Un motor de progreso compartido (`src/progress/`)**: todas las preguntas de todas las pestañas registran resultados ahí; alimenta el repaso espaciado, los niveles y el mapa de dominio. Guardado en `localStorage`, con exportar/importar a archivo JSON como respaldo.
- **Nube de carga**: potencial de Coulomb aproximado (cargas en grupos ionizables a pH 7, dieléctrico dependiente de la distancia), en un Web Worker, sobre la superficie molecular (rojo −, blanco neutro, azul +). No es APBS; la interfaz lo indica como "aproximación educativa".
- **Regla anti-spoiler**: durante una pregunta se desactivan colores, etiquetas y nubes que delaten la respuesta; se reactivan al responder como parte de la explicación.
- **Choques estéricos**: convención de MolProbity — choque cuando dos átomos no enlazados se solapan ≥ 0.4 Å respecto a la suma de sus radios de van der Waals.
- **Compartir sin servidor**: el estado de una vista se codifica en la URL (hash). Solo es compartible lo que viene de una fuente pública (ID del PDB o de UniProt/AlphaFold), no archivos subidos.

## 3. Descartado
- **Mol\***: más potente pero más pesado de integrar; 3Dmol.js basta.
- **RDKit.js para 2D**: WASM grande; SmilesDrawer es más ligero.
- **Backend / cuentas de usuario**: innecesario; el progreso vive en el navegador con respaldo exportable.
- **Biblioteca de rotámeros de Dunbrack**: su licencia restringe la redistribución. Usar en su lugar la *penultimate rotamer library* (Lovell et al., 2000) o equivalente de licencia abierta, verificando la licencia antes de incluirla.
- **Tutor con IA dentro de la app**: requeriría backend y claves de API.

## 4. Tareas

### Kit de visualización (`MolViewer`, transversal a todas las fases)
Componente único en `src/components/MolViewer/`, con barra de herramientas. Cada opción lleva un ícono "¿qué estoy viendo?" que explica en 1–2 frases qué enseña esa vista. Se construye por niveles a lo largo de las fases.

**Representaciones**: cartoon, sticks, ball & stick, esferas (vdW), líneas, superficie molecular (semitransparente u opaca).

**Modos de color** (para toda la molécula o solo la selección):
- Elemento (CPK); grupo de Lehninger; hidrofóbico/hidrofílico y gradiente Kyte-Doolittle; polar/no polar/cargado +/−; carga a pH 7.
- *Solo proteína*: estructura secundaria; arcoíris N→C; cadena; B-factor; confianza de AlphaFold (pLDDT).

**Superficies**: nube de carga (alcance: residuo seleccionado o proteína completa; para un aminoácido suelto, a pH 7); superficie por hidrofobicidad.

**Interacciones** (*solo proteína*, interruptores): puentes disulfuro; puentes salinos; expuestos vs enterrados (Shrake-Rupley); sitio de unión (< 5 Å de un ligando); **choques estéricos** (discos o puntas rojas, estilo MolProbity).

**Herramientas**: etiquetas; medir distancias y ángulos (incluye ángulos diedros φ, ψ, χ); centrar/restablecer; barra de secuencia sincronizada con el 3D; captura PNG; **compartir vista por enlace**.

---

### Fase 0 — Base del proyecto
1. Crear app con Vite (React + TS). Instalar `3dmol` y `smiles-drawer`.
2. Layout con las **seis pestañas** (las que aún no existen muestran "Próximamente" con estilo lúdico). Responsive: debe usarse bien en el celular.
3. Despliegue a GitHub Pages con GitHub Actions (`.github/workflows/deploy.yml`).
4. Vitest con una prueba mínima.
5. Esqueleto vacío de `src/data/`, `src/progress/` y `src/components/MolViewer/` con un README corto en cada uno explicando su propósito.

### Fase 1 — Datos + Clasificación + MolViewer básico
1. `src/data/aminoacids.ts`: por cada uno de los 20: nombre en español, códigos de 3 y 1 letra, grupo, SMILES neutro, masa molecular, pKa (α-COOH, α-NH3+, cadena lateral si aplica), pI, hidropatía Kyte-Doolittle, si es esencial en humanos, codones, `standard: true`, nota característica. Una sola fuente de valores, anotada en comentario.
2. SDF ideales de RCSB (`https://files.rcsb.org/ligands/view/{CODIGO}_ideal.sdf`) en `public/structures/`.
3. MolViewer nivel básico: representaciones, modos de color para aminoácido suelto, nube de carga a pH 7, superficie por hidrofobicidad, etiquetas, medir, captura. **Por defecto abre con los hidrógenos ocultos y las etiquetas de átomo activadas** (ver "Cambios al plan").
4. Vista de clasificación: tarjetas por grupo; detalle con 2D, MolViewer y propiedades. Filtros y buscador. **Cada grupo incluye, plegada, una explicación de por qué se llama así** (ver "Cambios al plan").
5. **Modo comparar** dos aminoácidos lado a lado.
6. Pruebas: 20 aminoácidos, grupo válido, SMILES no vacío, SDF existente, pI coherente con sus pKa.

### Fase 2 — Química interactiva (Pestaña 1)
1. **Simulador de pH y pI**: deslizador de pH (0–14) que actualiza en vivo:
   - La estructura 2D con el estado de protonación de cada grupo a ese pH (aquí sí aparecen las formas ionizadas y el zwitterión).
   - La carga neta (con fracciones, por Henderson-Hasselbalch).
   - La nube de carga en 3D.
   - La **curva de titulación** dibujada, con pKa y pI marcados, y la posición actual del deslizador.
   - Preguntas integradas: "¿Qué carga tiene His a pH 5?", "¿A qué pH Asp es neutro en promedio?".
2. **Constructor de estructuras**:
   - *Armar en 2D*: el núcleo (Cα, amino, carboxilo) está fijo; se arrastran fragmentos (CH2, CH3, OH, SH, anillo, COOH, NH2…) para construir la cadena lateral pedida. La app valida comparando con el SMILES. Incluye modo de reto a ciegas («¿Quién soy?»).
   - *Dibujar de memoria*: lienzo de dibujo simple; al terminar se muestra lado a lado con la estructura correcta y el usuario se autocalifica (no se exige reconocimiento automático).
   - *Constructor 3D de cadenas laterales*: parte de la base 3D del aminoácido ($\mathrm{H_2N{-}C_\alpha H{-}COOH}$) en `MolViewer`, muestra en el cuadro del residuo solicitado las **características buscadas** (grupo de Lehninger, carga a pH 7, carácter hidrofóbico/polar, puentes de H, anillos/heteroátomos y arquitectura 3D) y permite elegir entre las cadenas laterales para formarlo en 3D. Al elegir una cadena lateral, evalúa propiedad por propiedad qué aporta esa cadena lateral marcando con **✅ acierto** las que coinciden y con **❌ tache** las características incorrectas.
3. **Mnemotecnias y datos curiosos** en la ficha de cada aminoácido: truco para recordarlo (contenido original), origen del nombre, esencial o no, codones, dónde aparece en la vida real (ej. Trp y serotonina, Glu y sabor umami). Guardado en `src/data/trivia.ts`.
4. **Simulador de mutaciones** (nivel aminoácido): elegir X → Y y ver comparación de tamaño, carga, polaridad, hidropatía, capacidad de puente de H y si ambos son intercambiables según una matriz de sustitución (BLOSUM62). Explicación del efecto probable. Casos reales precargados (ej. Glu→Val de la anemia falciforme).

### Fase 3 — Autoevaluación + motor de progreso (Pestaña 2)
1. **Motor de progreso** (`src/progress/`): registra cada respuesta (aminoácido, habilidad, acierto, tiempo); expone dominio por aminoácido y por habilidad. Habilidades: estructura 2D, 3D, propiedades, química (pH/pI), en proteína, conformación.
2. Tipos de pregunta: 2D → nombre; 3D rotable → nombre; nombre → elegir 2D entre 4; propiedades (grupo, código, carga a pH 7, esencial…); nube de carga o hidropatía → "¿cuál podría ser?".
3. Distractores plausibles (Leu/Ile/Val, Asp/Glu, Asn/Gln, Ser/Thr/Cys, Phe/Tyr, Lys/Arg).
4. Retroalimentación inmediata con explicación y ficha; regla anti-spoiler en el 3D.
5. Configuración de sesión; resumen final; "repasar mis errores".
6. **Repaso espaciado diario**: algoritmo FSRS (librería `ts-fsrs`, verificar licencia) o, si se complica, sistema Leitner. Sesión diaria corta con lo que estoy por olvidar; racha de días; recordatorio visible al abrir la app.

### Fase 4 — Proteínas: núcleo (Pestaña 3)
1. **Cargar**: por ID del PDB (`https://files.rcsb.org/download/{ID}.pdb`, respaldo `.cif`); subiendo `.pdb`/`.cif` (botón y arrastrar, solo en navegador); sugeridas 1CRN, 1UBQ, 1LYZ. Errores claros e indicador de carga. Mostrar título, número de cadenas y residuos.
2. MolViewer nivel proteína: modos solo-proteína, nube de carga completa y por residuo, interacciones, barra de secuencia.
3. **Explorar**: clic en residuo → sticks + nombre, número, cadena, grupo, características, expuesto/enterrado, estructura secundaria, φ/ψ, participación en disulfuro o puente salino.
4. **Evaluación "¿Qué cadena lateral es esta?"** (modo principal):
   - Se resalta solo la cadena lateral (Gly: su Cα), resto atenuado, cámara centrada, rotación libre, sin pistas.
   - 4 opciones con distractores plausibles.
   - **Si fallo**: marcar error, señalar la correcta, explicar la diferencia, comparación 2D lado a lado, ficha completa.
   - **Si acierto**: celebración + ficha compacta.
   - Puntaje, racha, resumen y "practicar mis fallos". Registrar en el motor de progreso.
5. Preguntas secundarias: selecciona un residuo [aromático / cargado +…]; selecciona una [Cys / Pro…]; ¿expuesto o enterrado y tiene sentido?; ¿qué estructura secundaria?; selecciona un disulfuro / puente salino; zona cargada positiva con la nube; ¿dónde está el núcleo hidrofóbico?
6. Reglas: solo los 20 estándar; excluir residuos con átomos de cadena lateral faltantes; primera conformación alternativa; solo preguntas con respuesta válida; variar aminoácidos.

### Fase 5 — Laboratorio estructural (Pestaña 4)
1. **Gráfico de Ramachandran**:
   - Para la proteína cargada: cada residuo como punto (φ, ψ), coloreado por tipo; regiones favorecidas / permitidas / prohibidas sombreadas.
   - Gráficos separados para **general, Gly, Pro y pre-Pro**, explicando por qué difieren.
   - Contornos de referencia: datos Top8000 del laboratorio Richardson (verificar licencia; si no es redistribuible, usar regiones simplificadas documentadas).
   - Sincronizado con el 3D: clic en un punto → resalta el residuo; clic en un residuo → resalta el punto. Seleccionar con el ratón una región del gráfico (ej. hélice α) resalta esos residuos en 3D.
   - Marcar los **outliers** y explicar posibles causas.
2. **Rotar φ y ψ** de un residuo con deslizadores:
   - Funciona en un **péptido** (ver punto 4) y en la **proteína cargada**. En la proteína, rotar mueve todo lo que sigue en la cadena (efecto palanca), y se debe ver.
   - El punto se mueve en vivo en el Ramachandran; avisos de "región prohibida" y choques dibujados en vivo.
   - Botón "restaurar original".
3. **Rotámeros (ángulos χ)**:
   - Seleccionar un residuo y rotar sus χ1, χ2… con deslizadores, o saltar entre los **rotámeros de la biblioteca** (con su frecuencia).
   - Mostrar en vivo los **choques** con el resto de la proteína y una puntuación sencilla: número de choques, si pierde puentes de H o salinos, si queda en una posición poco frecuente.
   - Gráfico χ1 vs χ2 con la posición actual y los rotámeros frecuentes.
   - Retos: "encuentra el rotámero sin choques", "¿por qué este rotámero es raro?".
4. **Constructor de péptidos**:
   - Escribir una secuencia corta (hasta ~15 residuos, códigos de 1 letra) → se construye en 3D con geometría ideal (algoritmo NeRF) en una conformación elegida: extendida, hélice α, lámina β, o φ/ψ personalizados.
   - Animación del enlace peptídico formándose (condensación, salida de agua) y explicación de su planaridad.
   - Carga neta del péptido vs pH (curva) y pI estimado.
   - Combinable con los puntos 2 y 3 (rotar y ver choques).
5. Preguntas de laboratorio: "¿Este par φ/ψ es hélice, lámina o prohibido?", "¿Por qué Gly puede estar aquí y Ala no?", "¿Cuál de estos rotámeros choca?".

### Fase 6 — Proteínas: avanzado (Pestaña 3)
1. **Mutar dentro de la proteína**: elegir un residuo y cambiarlo por otro aminoácido; se coloca el rotámero con menos choques. Panel de efectos: choques nuevos, puentes salinos/disulfuros perdidos o ganados, cambio de carga local, hidrofóbico expuesto o polar enterrado, puntuación BLOSUM62. Explicación didáctica. Aclarar que es una estimación, no una predicción de estabilidad.
2. **Modelos AlphaFold**: cargar por ID de UniProt usando la API de AlphaFold DB (`https://alphafold.ebi.ac.uk/api/prediction/{UniProtID}`, que devuelve la URL del archivo). Color por confianza (pLDDT, guardado en la columna B-factor) con su leyenda estándar. Explicar qué significa baja confianza (regiones desordenadas).
3. **Recorridos guiados** (estilo Molécula del Mes / Proteopedia, con **texto original**, sin copiar esos sitios):
   - Formato: archivo JSON por recorrido en `src/data/tours/`; cada paso define cámara, selección, representación, colores y texto.
   - Recorridos iniciales (verificar IDs del PDB): hemoglobina (4HHB) y anemia falciforme (2HBS); lisozima (1LYZ) y su sitio activo; GFP (1EMA) y su cromóforo; colágeno (1CAG) y por qué tanta Gly y Pro.
   - Preguntas al final de cada recorrido, registradas en el progreso.

### Fase 7 — Juegos (Pestaña 5)
Todos registran en el motor de progreso y respetan el estilo lúdico.
1. **Ahorcado de aminoácidos**: adivinar una palabra en español eligiendo estructuras 2D en vez de letras (cada estructura = su código de una letra). Las palabras solo pueden usar las 20 letras válidas (sin B, J, O, U, X, Z, Ñ); lista curada en `src/data/words.ts`. Pistas en "frases de aminoácidos".
2. **Arcade de invasores**: se pide un código o nombre; caen estructuras y se dispara a las incorrectas, atrapando la correcta. Dificultad creciente; vidas y puntaje. Canvas, controles de teclado y táctiles.
3. **Memorama**: emparejar estructura 2D, nombre y código; modos por grupo o los 20; contra reloj; récord personal.

### Fase 8 — Progreso, examen y docente (Pestaña 6 y transversal)
1. **Mapa de dominio**: cuadrícula de los 20 aminoácidos × habilidades, coloreada por dominio; clic → practicar justo eso.
2. **Niveles**: principiante → intermedio → avanzado → experto, por habilidad; desbloquean tipos de pregunta y retos; insignias.
3. **Modo examen**: cronometrado, mezcla todas las pestañas, sin retroalimentación hasta el final, calificación y revisión detallada.
4. **Compartir escenas por enlace**: desde MolViewer, generar URL que reabre la misma proteína, vista, colores y selección.
5. **Modo docente**:
   - Crear preguntas propias sobre una proteína (seleccionar residuos, escribir pregunta y opciones) y recorridos propios (grabar pasos de cámara + texto).
   - Exportar como archivo JSON o, si es pequeño, como enlace. El alumno lo abre y sus resultados se ven al final (sin servidor, el docente no los recibe automáticamente; el alumno puede exportar su resultado).
6. Exportar/importar todo el progreso como archivo.

### Fase 9 — Pulido y extras
1. Accesibilidad (teclado, contraste, no depender solo del color: patrones o etiquetas alternativas).
2. Rendimiento en celular con proteínas medianas.
3. README con cómo correr el proyecto y enlace a GitHub Pages.
4. Extras a planear después: perfil de hidropatía con detección de hélices transmembrana; puentes de hidrógeno; composición y pI de la proteína; interacciones aromáticas (apilamiento π, catión-π); aminoácidos no estándar.

## 5. Criterios de terminado (globales)
- `npm run build` y `npm test` pasan en cada fase.
- El sitio publicado en GitHub Pages refleja la fase terminada.
- Ningún modo de quiz o juego revela la respuesta por colores o etiquetas.
- Todo dato bioquímico viene de `src/data/` con su fuente anotada.
- Cada fase cierra con la sección "Resultado" en su handoff.
- Ejemplos de comprobación por fase:
  - F1: nube roja en la cadena lateral de Asp y azul en Lys; hidropatía distingue Leu de Ser.
  - F2: con el deslizador en pH 7, Gly aparece como zwitterión con carga neta ≈ 0; la curva de His muestra tres pKa.
  - F4: en 1UBQ, cargada por ID y por archivo, el quiz de cadena lateral funciona con retroalimentación completa.
  - F5: en 1UBQ, el Ramachandran muestra la mayoría de puntos en zonas favorecidas; rotar el φ de un residuo de una hélice a valores prohibidos dispara aviso y choques visibles.
  - F6: mutar un Leu enterrado de 1UBQ a Lys muestra "polar/cargado enterrado" en el panel de efectos.

## 6. Dudas abiertas
- Ninguna para la Fase 0. Las dudas de cada fase se resolverán en su propio handoff.

---
**Instrucción para Claude Code:** implementa **solo la Fase 0** en esta sesión. Al terminar, haz commit, push, añade la sección "Resultado" a este archivo y espera indicaciones antes de seguir.

---

## Cambios al plan
Decisiones tomadas después de escribir este plan. El detalle de cada una está en el handoff de la fase correspondiente.

| Fecha | Fase | Cambio | Motivo |
| --- | --- | --- | --- |
| 2026-10-12 | 1 | **Esencialidad con tres estados** (`essential`, `conditional`, `nonessential`) en lugar del booleano "si es esencial en humanos". | Decidido en el handoff de la Fase 1 (clasificación de Lehninger). |
| 2026-10-12 | 1 | **Hidrógenos ocultos por defecto** en `MolViewer`; se muestran con el interruptor "Mostrar hidrógenos". | Petición de José Manuel tras ver la Fase 1: la forma de la molécula se lee mejor. |
| 2026-10-12 | 1 | **Etiquetas de átomo activadas por defecto** en `MolViewer` (nombres CCD en los átomos pesados). Con anti-spoiler siguen ocultas. | Petición de José Manuel tras ver la Fase 1. |
| 2026-10-12 | 1 | **Explicación "¿Por qué se llaman así?" en cada grupo** de la vista de clasificación: bloque plegado por defecto, debajo de las tarjetas y dentro del recuadro del grupo, con texto original en `GROUPS[...].explanation` (`src/data/aminoacids.ts`). | Petición de José Manuel: la frase del encabezado del grupo era escueta. |
| 2026-10-16 | 2 | **Constructor 3D de cadenas laterales** (`src/tabs/classification/StructureBuilder3D.tsx`, `src/data/sideChainTraits.ts`, prop `hideSideChain` en `MolViewer`): parte de la base 3D común ($\mathrm{H_2N{-}C_\alpha H{-}COOH}$), muestra en el cuadro de solicitud las características buscadas del residuo y, al elegir una cadena lateral para acoplarla en 3D, detalla qué propiedades proporciona marcando con ✅ las correctas y con ❌ tache las características incorrectas. | Petición de José Manuel para complementar el constructor 2D con un constructor 3D guiado por propiedades químicas. |

Consecuencias para fases posteriores:
- Los valores por defecto del visor son de todo el kit: las pestañas nuevas los heredan salvo que su handoff diga otra cosa. En quizzes (Fase 3 en adelante) las etiquetas quedan ocultas por la regla anti-spoiler, no por el valor por defecto.
- Los textos explicativos de los grupos son contenido didáctico de `src/data/`; si la Fase 2 añade mnemotecnias o trivia por grupo, van junto a ellos.

---

## Resultado — Fase 0 (2026-10-12)

### Hecho
1. App creada con Vite 8 + React 19 + TypeScript 6. Dependencias instaladas: `3dmol` 2.5.5 y `smiles-drawer` 2.4.1 (aún sin usar).
2. Layout con las **seis pestañas** (`src/tabs/tabs.ts` + `src/App.tsx`). Cada una muestra un panel "Próximamente" lúdico (ícono animado, burbujas con los colores de grupo, fase en que llega). En pantallas ≤ 720 px la barra pasa a ser una barra inferior fija con etiquetas cortas; la etiqueta completa queda para lectores de pantalla. Se respeta `prefers-reduced-motion`.
3. `.github/workflows/deploy.yml`: en cada push a `main` corre `npm ci`, `npm test`, `npm run build` y publica `dist/` con `actions/deploy-pages`. `base: '/tutorprotein/'` en `vite.config.ts`.
4. Vitest (jsdom + Testing Library): `src/App.test.tsx` comprueba que hay seis pestañas y que se puede cambiar de pestaña. `npm test` y `npm run build` pasan.
5. Esqueletos con README: `src/data/`, `src/progress/`, `src/components/MolViewer/`.

### Pendiente
- Nada de la Fase 0. Sitio publicado en https://jtuxman.github.io/tutorprotein/ (Pages con origen "GitHub Actions"; primer despliegue exitoso).

### Desviaciones y notas
- La pestaña activa se guarda solo en el estado de React (sin enrutamiento ni hash), para no condicionar el diseño de "compartir vista por enlace" de fases posteriores.
- Tokens de color por grupo de Lehninger definidos en `src/index.css` (`--group-*`), listos para la Fase 1.
- El workflow usa Node 22 (localmente se probó con Node 24).
- El push se hace con la cuenta `jtuxman` (`gh` con permiso `workflow`); los commits conservan como autor a `jmanuel-arakion`.
