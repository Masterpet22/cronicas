# Recursos de personajes activos

El juego usa `man_sprites/runtime/` y `woman_sprites/runtime/` para los cuerpos articulados, junto con `hair/hair_corto.png` y `hair/hair_coleta.png`. El Dojo, los viajes y el combate comparten estas imágenes.

Las fuentes vigentes de cada cuerpo están en `man_sprites/source/` y `woman_sprites/source/`: el PSD conserva el arte editable y `skeleton.json` conserva el rig de Kinetra junto con sus imágenes embebidas. Las piezas de `runtime/` se extraen de esos JSON, se recortan a sus límites alfa y mantienen la compensación de posición del rig.

Se retiraron los atlas, las 27 capas del sistema experimental anterior, las vistas previas y las exportaciones completas sin recortar. Los PSD anteriores permanecen en el historial; los archivos de `source/` son sus reemplazos vigentes.

`manifest.json` conserva los metadatos históricos del experimento de 768×768, utilizados por la comparación con el contrato artístico de 2048×2048. No es un catálogo de imágenes disponibles.

`npm run art:validate` sigue validando las seis combinaciones activas de cuerpo y cabello. Ver [validación de la plantilla artística](../../docs/VALIDACION_PLANTILLA_ARTISTICA.md).

El generador histórico `scripts/generate_modular_assets.ps1` requiere restaurar primero los atlas de `assets/modular/source/` desde Git; no se utiliza para construir los personajes actuales.
