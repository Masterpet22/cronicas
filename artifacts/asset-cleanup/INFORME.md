# Limpieza de assets sin uso

La carpeta assets pasa de **79.11 MB a 34.51 MB** (MB decimales): ahorro neto de **44.61 MB (56.38%)**.

Se retiraron 96 archivos (44,605,409 bytes). Los pequeños cambios de catálogos y documentación explican -924 bytes adicionales. El inventario pasa de 228 a 132 archivos.

Archivos presentes al iniciar esta limpieza, con el catálogo elemental original; excluye las dos referencias previamente eliminadas por el usuario. No se cuenta de nuevo el ahorro del cambio de estilo anterior.

| Grupo | Archivos | MB retirados |
| --- | ---: | ---: |
| Fuente de edición; las capas recortadas runtime son las utilizadas | 30 | 15.312 |
| Sistema modular experimental reemplazado por los rigs activos | 33 | 7.714 |
| Original PNG duplicado; el juego carga la versión WebP | 4 | 5.852 |
| Interfaz anterior sin referencias de carga | 4 | 3.363 |
| Efecto reemplazado por los spritesheets activos | 3 | 4.426 |
| Atlas de revisión; el juego solo carga iconos individuales | 1 | 0.880 |
| Iconos avanzados sustituidos por composición de afinidades básicas | 21 | 7.058 |

## Comportamiento

Se mantienen los 22 elementos y sus reglas de acceso. Solo se conservan las cuatro imágenes de tier 1. Los tiers superiores muestran los iconos básicos involucrados, tanto en el Dojo como en combate. Por ejemplo: Vapor = Agua + Fuego; Tormenta = Viento + Fuego + Agua. Phaser compone la textura una vez y la reutiliza.

El ahorro principal afecta al disco y al paquete distribuido. Los archivos huérfanos no se descargaban al jugar, por lo que no implican una mejora proporcional en segundos de carga. Las combinaciones ahora cargan/reutilizan únicamente las imágenes básicas necesarias y se componen en memoria.

Se conservan los cuerpos articulados masculino/femenino, el cabello corto y coleta, los fondos actuales, los retratos WebP y los efectos activos. Los PSD y exportaciones originales retirados estaban versionados: se recuperan del historial de Git para futuras ediciones. La limpieza no reduce el tamaño del historial de Git.

## Verificación

- npm test: 33 suites superadas
- Playwright: Dojo y carga diferida (9 casos), combate de iconos compuestos Canvas/WebGL e impactos elementales (3 casos)
- Rutas literales del código activo revisadas antes de eliminar; rutas dinámicas de personajes, fondos y efectos comprobadas
- Los 96 archivos eliminados están versionados y se pueden recuperar desde Git

El detalle de cada archivo, su peso y la razón de eliminación está en [audit.json](audit.json).
