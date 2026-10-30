# Sistema de iconos elementales

La progresión se organiza en cuatro niveles. Solo se conservan los cuatro iconos básicos, con lienzo transparente de `512 × 512` píxeles.

- Nivel 1, básicos: Fuego, Agua, Tierra y Viento.
- Nivel 2, secundarios: combinación de dos básicos.
- Nivel 3, terciarios: combinación de un secundario y un básico.
- Nivel 4, especiales: combinaciones excepcionales de dos secundarios.

`manifest.json` registra nombres, rutas básicas y elementos parentales. Los tiers 2–4 muestran juntos los iconos de sus afinidades básicas: por ejemplo, Vapor usa Agua + Fuego. El Dojo y el combate comparten la composición definida en `src/elements.js`; Phaser la genera en memoria con las imágenes básicas ya cargadas. No se descargan imágenes adicionales para estas combinaciones.

Los iconos avanzados y las hojas completas se eliminaron de `assets`; pueden recuperarse del historial de Git si se necesita revisar el arte anterior. Las reglas y los desbloqueos elementales se conservan.
