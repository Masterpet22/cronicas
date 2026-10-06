# Personajes modulares

Este directorio contiene las capas ilustradas usadas directamente por Phaser. Todos los PNG son transparentes, miden `768 × 768` y comparten exactamente los mismos anclajes, por lo que se superponen sin ajustes manuales. El arte fuente fue creado con la generación de imágenes integrada tomando como referencia la hoja técnica del proyecto; no son figuras geométricas dibujadas por el motor.

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
