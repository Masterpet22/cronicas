# Hallazgos durante el refactor

## Auditoría de perfiles de Phaser — 26 de octubre de 2026

- En Chromium con ANGLE/SwiftShader se observan recortes triangulares de piezas de marioneta
  durante la postura de preparación. La anomalía ya está presente en la captura WebGL de fase 0
  `artifacts/phaser-performance/1366x768-webgl-normal-charged-turn.png` y vuelve a aparecer en
  las referencias de fase 1; Canvas dibuja completas esas piezas. No hay excepción de consola
  asociada. Pendiente aislar pipeline/driver antes de aprobar el arte definitivo; esta evidencia
  no demuestra un fallo en los PNG ni una regresión introducida por los perfiles de arena.

Este archivo registra anomalías encontradas durante reorganizaciones que no deben mezclarse con cambios de comportamiento.
