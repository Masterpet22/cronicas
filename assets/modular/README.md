# Archivo experimental de personajes modulares

Este directorio conserva los atlas y capas ilustradas experimentales. Las variantes de personalización no se cargan directamente en Phaser porque sus proporciones y anclajes todavía no son suficientemente consistentes para producción. La única excepción es `man_sprites/runtime/`, que contiene las piezas raster de la marioneta provisional utilizada actualmente en viajes y combates.

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

## Regeneración

Desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate_modular_assets.ps1
```

El script recorta, limpia y alinea los atlas de `source/` para producir dos cuerpos, tres rostros, cinco peinados, tres prendas superiores, tres inferiores, dos calzados y cuatro armas experimentales. Su integración y teñido en Phaser quedan pendientes hasta aprobar una plantilla artística común.
