# Recursos de personajes activos

El juego usa `man_sprites/runtime/` y `woman_sprites/runtime/` para los cuerpos articulados, junto con `hair/hair_corto.png` y `hair/hair_coleta.png`. El Dojo, los viajes y el combate comparten estas imágenes.

Se retiraron los atlas, las 27 capas del sistema experimental anterior, las vistas previas, los PSD y las exportaciones completas sin recortar. Las fuentes estaban versionadas y pueden recuperarse del historial de Git para editar el arte. No forman parte de los recursos distribuidos.

`manifest.json` conserva los metadatos históricos del experimento de 768×768, utilizados por la comparación con el contrato artístico de 2048×2048. No es un catálogo de imágenes disponibles.

`npm run art:validate` sigue validando las seis combinaciones activas de cuerpo y cabello. Ver [validación de la plantilla artística](../../docs/VALIDACION_PLANTILLA_ARTISTICA.md).

El generador histórico `scripts/generate_modular_assets.ps1` requiere restaurar primero los atlas de `assets/modular/source/` desde Git; no se utiliza para construir los personajes actuales.
