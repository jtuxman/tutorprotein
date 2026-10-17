# `src/progress/` — motor de progreso

Motor compartido (Fase 3) donde **todas** las preguntas, quizzes, juegos y retos registran sus resultados: aminoácido, habilidad, acierto y tiempo de respuesta.

- `progress.ts`: modelo de 6 habilidades (`structure2d`, `structure3d`, `properties`, `chemistry`, `protein`, `conformation`), historial de intentos, tarjetas de repaso espaciado con 5 cajas de **Leitner** (`LEITNER_INTERVALS`), cálculo de dominio por celda (`cellMastery`), aminoácido (`aminoAcidMastery`) y habilidad (`skillMastery`), racha diaria (`currentStreak`) y exportación/importación JSON.
- `index.ts`: reexporta el motor y el hook `useProgress()` basado en `useSyncExternalStore`.

Guarda en `localStorage` envuelto en `try/catch`. Ninguna pestaña guarda progreso por su cuenta.
