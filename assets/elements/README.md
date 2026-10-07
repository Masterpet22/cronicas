# Sistema de iconos elementales

La iconografía se organiza en cuatro niveles. Cada icono individual ocupa un lienzo transparente de `512 × 512` píxeles y cada hoja usa celdas del mismo tamaño en orden de lectura, de izquierda a derecha y de arriba abajo.

- Nivel 1, básicos: Fuego, Agua, Tierra y Viento.
- Nivel 2, secundarios: combinación de dos básicos.
- Nivel 3, terciarios: combinación de un secundario y un básico.
- Nivel 4, especiales: combinaciones excepcionales de dos secundarios.

`manifest.json` es la fuente de verdad para nombres, rutas, cuadrículas y elementos parentales. Las hojas completas se conservan para revisión artística; el juego debe cargar preferentemente los archivos individuales.
