# Archivo experimental de personajes modulares

Este directorio conserva los atlas y capas ilustradas experimentales. Ya no se cargan directamente en Phaser: sus proporciones y anclajes visuales no son suficientemente consistentes para un personalizador de producción. Se mantienen como referencia para el futuro diseño definitivo.

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

El script recorta, limpia y alinea los atlas de `source/` para producir los dos cuerpos, tres rostros, cinco peinados, tres prendas superiores, tres inferiores, dos calzados y cuatro armas. Phaser puede teñir las prendas para ampliar las combinaciones sin duplicar recursos.
