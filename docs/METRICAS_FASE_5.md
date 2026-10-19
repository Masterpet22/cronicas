# Métricas de la Fase 5 · Contenido

Fecha de cierre: 19 de octubre de 2026.

- Siete misiones y sus 18 diálogos quedaron en carpetas individuales bajo `src/content/sagas/futuro-prometedor/`.
- La definición de la saga y el orden de registro están en `saga.js`; `content/index.js` agrega catálogos sin lógica de misión.
- Las rutas del médico y las zonas de investigación de Kagemori ahora viven junto a `s02` y `s01`.
- `src/data.js` ya no define misiones. `src/dialogues.js` conserva los diálogos de NPC y ensambla las claves de misión.
- Las pruebas validan asignación de diálogos, misión propietaria, speakers y variables admitidas.
- `npm test`: 16 suites correctas.
- `npm run smoke`: 4 recorridos correctos, incluidas las finalizaciones de `m01` y `m05`.

Los IDs públicos de misión y diálogo se conservaron sin cambios.
