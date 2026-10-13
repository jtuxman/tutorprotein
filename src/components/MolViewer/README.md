# `MolViewer` — visor 3D compartido

Componente único, basado en **3Dmol.js**, que usan todas las pestañas. Si una pestaña necesita una vista nueva, se agrega aquí, no en un visor aparte. Nivel actual: **básico (aminoácido suelto)**; cartoon, modos solo-proteína, interacciones y barra de secuencia llegan en la Fase 4.

## Uso

```tsx
import { MolViewer, aminoAcidMolecule } from '../components/MolViewer'

<MolViewer molecule={aminoAcidMolecule(aminoAcid)} />
```

| Prop | Tipo | Por defecto |
| --- | --- | --- |
| `molecule` | `{ kind: 'sdf'; url: string; aminoAcid?: AminoAcid }` | — |
| `representation` | `'ballstick' \| 'sticks' \| 'spheres' \| 'lines'` | `'ballstick'` |
| `colorMode` | `'element' \| 'group' \| 'hydrophobic' \| 'kyte-doolittle' \| 'polarity' \| 'charge'` | `'element'` |
| `surface` | `'none' \| 'charge-cloud' \| 'hydrophobicity'` | `'none'` |
| `surfaceOpacity` | `number` (0–1) | `0.85` |
| `showHydrogens` | `boolean` | `false` |
| `labels` | `'none' \| 'atoms'` | `'none'` |
| `spoilerFree` | `boolean` | `false` |
| `toolbar` | `boolean` | `true` |
| `onStateChange` | `(state: MolViewerState) => void` | — |

- **Controlado o no**: cada prop de estado que se pasa manda sobre el estado interno; las que no se pasan las maneja la barra de herramientas. Para sincronizar dos visores (modo comparar) se guarda un `MolViewerState` fuera y se pasa a ambos junto con `onStateChange`.
- **Anti-spoiler** (`spoilerFree`): fuerza `colorMode: 'element'`, `surface: 'none'` y sin etiquetas, desactiva esas opciones en la barra y oculta la leyenda, el nombre y el código (también en el nombre del PNG). Medir, centrar y capturar siguen disponibles.
- Sin `aminoAcid` solo hay color por elemento y ninguna superficie ni etiqueta.
- Las rutas a `public/structures/` se construyen con `import.meta.env.BASE_URL` (`aminoAcidMolecule`).

## Piezas

| Archivo | Contenido |
| --- | --- |
| `MolViewer.tsx` | Ciclo de vida del visor: carga, estilos, etiquetas, medidas, superficies, captura. Libera el contexto WebGL y termina el worker al desmontar. |
| `Toolbar.tsx`, `Legend.tsx` | Barra (plegable en celular) con ⓘ "¿Qué estoy viendo?" y leyendas. |
| `types.ts` | Props, estado y `resolveState` (props + anti-spoiler). |
| `coloring.ts` | Color por átomo de cada modo (puro). Esqueleto en gris; solo se colorea la cadena lateral. |
| `chargeCloud.ts`, `chargeCloud.worker.ts` | Nube de carga: `computePotentialGrid` (puro) y el Web Worker que lo ejecuta. |
| `measure.ts` | Distancia, ángulo y diedro a partir de los átomos tocados (usa `src/chem/geometry.ts`). |
| `palette.ts` | Paleta única del visor; los colores de grupo se leen de las variables CSS `--group-*`. |
| `explanations.ts` | Textos originales de cada opción. |
| `orientation.ts` | Orientación inicial "de frente" (ejes principales). |
| `load3Dmol.ts`, `structures.ts` | Importación diferida de 3Dmol y carga (con caché) de SDF y `atom-names.json`. |

## Nube de carga
Potencial de Coulomb aproximado a pH 7, **aproximación educativa, no APBS**: cada grupo ionizable aporta su carga de Henderson-Hasselbalch repartida entre sus átomos; φ(p) = Σ qᵢ / (4 rᵢ²) (dieléctrico ε = 4r, r mínimo 1 Å), sobre una rejilla de 0.5 Å con 5 Å de margen. Se pinta sobre la superficie SES con un gradiente rojo-blanco-azul de **escala fija ±0.05** (`CLOUD_SCALE`), igual para los 20. La estructura siempre se dibuja neutra.

## Pruebas
jsdom no tiene WebGL: en las pruebas de otras pestañas `MolViewer` se mockea; en las suyas se mockea `load3Dmol`.
