# Archivo experimental de personajes modulares

Este directorio conserva los atlas y capas ilustradas experimentales. Las variantes de personalización no se cargan directamente en Phaser porque sus proporciones y anclajes todavía no son suficientemente consistentes para producción. Las excepciones son `man_sprites/runtime/` y `woman_sprites/runtime/`, que contienen las piezas raster elegidas según el tipo de cuerpo del perfil y utilizadas en viajes y combates.

## Orden de renderizado

1. Cabello trasero
2. Cuerpo base
3. Parte inferior
4. Calzado
5. Parte superior
6. Rostro
7. Cabello delantero
8. Arma

`manifest.json` registra las variantes y los anclajes `HEAD`, `NECK`, `SHOULDER_L/R`, `HAND_L/R`, `WAIST`, `FOOT_L/R` y `WEAPON_HAND`.

Los recursos `hair/hair_corto.png` y `hair/hair_coleta.png` son las variantes aprobadas para ejecución. Se comparten entre los cuerpos masculino y femenino y corresponden a las opciones 1 (Corto) y 4 (Coleta).

## Regeneración

La validación del runtime y la plantilla común candidata están documentadas en
[`../../docs/VALIDACION_PLANTILLA_ARTISTICA.md`](../../docs/VALIDACION_PLANTILLA_ARTISTICA.md).
Ejecutar `npm run art:validate` desde la raíz genera el informe y la lámina comparativa.
El contrato nuevo 2048×2048 no convierte estos atlas 768×768 en recursos aprobados.

Desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate_modular_assets.ps1
```

El script recorta, limpia y alinea los atlas de `source/` para producir dos cuerpos, tres rostros, cinco peinados, tres prendas superiores, tres inferiores, dos calzados y cuatro armas experimentales. Su integración y teñido en Phaser quedan pendientes hasta aprobar una plantilla artística común.
