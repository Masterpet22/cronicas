# Personajes modulares

Este directorio contiene las capas de personajes usadas directamente por Phaser. Todos los PNG son transparentes, miden `512 × 512` y comparten exactamente los mismos anclajes, por lo que se superponen sin ajustes manuales.

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

El script produce de forma determinista los dos cuerpos, tres rostros, cinco peinados divididos en capa trasera y delantera, tres prendas superiores, tres inferiores, dos calzados y cuatro armas. Las prendas se mantienen en tonos neutros para que Phaser pueda teñirlas según cada personaje.
