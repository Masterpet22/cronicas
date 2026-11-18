# Inventario de recursos fuera del juego

18 de noviembre de 2026 · Base `d375ec1` · Tamaño en MB decimales, medido sobre los archivos versionados presentes en disco.

Las **24 trazas ZIP de Playwright retiradas en `optimizacion` sumaban 486,12 MB**, alrededor del 60 % de los 807,92 MB versionados en la copia de trabajo de la base. El juego no consulta `artifacts/` ni `modelos-interfaz/`. Parte de esos directorios documenta decisiones, pruebas y procesos de producción.

| Directorio | Archivos | Tamaño | Uso |
| --- | ---: | ---: | --- |
| `artifacts/` | 358 | 738,36 MB | Evidencias, informes y algunas herramientas de desarrollo |
| `assets/` | 194 | 60,02 MB | Recursos del juego, fuentes de arte, catálogos y referencias |
| `modelos-interfaz/` | 3 | 6,78 MB | Tres propuestas visuales de diseño |

GitHub Pages prepara el sitio con `path: .`. Cambiar el paquete de despliegue para incluir solo los archivos del juego permite quitar fuentes y evidencias del sitio conservándolas en el repositorio. Retirar archivos en un nuevo commit reduce la copia de trabajo. Los objetos de commits anteriores seguirán ocupando espacio en `.git`. Las trazas y fuentes que el navegador nunca solicita tampoco explican sus FPS. [Flujo de publicación](../.github/workflows/deploy-pages.yml)

## Primer lote retirado

Las siguientes carpetas contenían las 24 trazas en la base `d375ec1`. El inventario cuenta exclusivamente los ZIP de cada carpeta, incluidos sus subdirectorios. Los informes JSON y las capturas se conservaron.

| Carpeta bajo `artifacts/` | ZIP | Bytes |
| --- | ---: | ---: |
| `tutorial-exit-tests/` | 1 | 100 571 327 |
| `tutorial-polish-combat-final/` | 2 | 91 641 473 |
| `saga-integration-tests/` | 3 | 90 044 930 |
| `saga-combat-tests/` | 1 | 45 386 115 |
| `tutorial-polish-ui/` | 4 | 39 951 113 |
| `tutorial-polish-performance/` | 2 | 33 363 735 |
| `saga-regression-tests/` | 3 | 31 579 798 |
| `tutorial-redesign-browser/` | 1 | 23 953 718 |
| `tutorial-polish-levels/` | 2 | 18 906 476 |
| `saga-preparation-tests/` | 4 | 9 520 885 |
| `progression-regression-tests/` | 1 | 1 196 383 |
| **Total** | **24** | **486 115 953** |

Las trazas históricas se pueden recuperar del commit base para revisar un fallo antiguo. Las próximas ejecuciones guardan sus trazas en `test-results/`, que ya está ignorado por Git.

## Archivos de `assets/` que el juego no carga

La revisión cruzó referencias en HTML, CSS y JavaScript con rutas construidas a partir de catálogos. Para los elementos con uso fuera del juego, también se revisaron pruebas, scripts y documentación. Las cantidades incluyen solo los archivos exactos indicados.

| Ruta o conjunto | Archivos | Bytes | Tratamiento |
| --- | ---: | ---: | --- |
| `assets/sellos-originales.webp` | 1 | 276 364 | Candidato directo. Se conserva una hoja distinta, `sellos-constelaciones.png`, que el juego sí carga. |
| `assets/ui/hud-themes/{ancestral,lunar}-{action-slot,speed-sword}.png` | 4 | 3 372 531 | El HUD actual dibuja esos adornos por código. Quedan entradas en `BATTLE_INTERFACE_SKINS` y aserciones sobre esas PNG. Retirar las entradas y actualizar la verificación en el mismo cambio. Conservar `ancestral.webp` y `lunar.webp`. |
| `assets/modular/{man,woman}_sprites/runtime/` con `torso.png`, `muslo_derecho.png`, `muslo_izquierdo.png`, `pierna_derecha.png`, `pierna_izquierda.png`, `pie_derecho.png` y `pie_izquierdo.png` por cuerpo | 14 | 894 958 | El creador, Dojo y combate sustituyen esas capas por las del atuendo. Las usa `assets.test.mjs` y el generador de la hoja de referencia en `artifacts/correcciones/outfit-reference.mjs`. Conservarlas como material de producción o adaptar ambos consumidores antes de moverlas. |
| `assets/modular/{man,woman}_sprites/source/` | 5 | 19 720 155 | Dos PSD, dos rigs Kinetra y la cabeza de referencia masculina. Conservar como fuentes editables. |
| `assets/modular/faces/source/` | 3 | 384 637 | Originales de rostro. `scripts/normalize-character-faces.ps1` los utiliza para generar las variantes activas. |
| `assets/modular/hair/source/short.png` | 1 | 331 917 | Original de edición del cabello corto. La textura activa es `hair_corto.png`. |
| `assets/modular/outfits/training/source/{atlas.png,layout.json}` | 2 | 431 746 | Entradas de `scripts/import-training-outfit.mjs`. Mantenerlas juntas para regenerar el atuendo. |
| `assets/modular/manifest.json` y `assets/reference/character-template-v1.{json,svg}` | 3 | 5 987 | Datos de validación y guía artística de `npm run art:validate`. |
| `assets/elements/manifest.json` | 1 | 3 988 | Catálogo de referencia. Los iconos del juego se resuelven desde `src/elements.js` y las reglas de composición. |
| **Total de estas filas** | **34** | **25 422 283** | Las fuentes y entradas de herramientas se pueden excluir del paquete de juego y conservar para desarrollo. |

Las rutas dinámicas mantienen activos los nueve fondos en `assets/locations/`, las 27 variantes de rostro por expresión y tono, las tres imágenes base de rostro usadas por el catálogo cosmético, las piezas del atuendo, las capas de piel de ambos cuerpos y el cabello. Mantener las licencias y los manifiestos que acompañan recursos redistribuidos. [Carga de capas en combate](../src/fighters.js) · [Vista previa del personaje](../src/ui/meta/character-preview.js) · [Pruebas de recursos](../tests/assets.test.mjs)

## Capturas, informes y archivos duplicados

Fuera de los ZIP, `artifacts/` contiene 334 archivos y **252,24 MB**. De ese total, 237 PNG suman **247,59 MB**. Seleccionar una captura por estado importante, conservar los informes que explican los resultados y archivar las repeticiones. Entre las entradas que deben revisarse al mover archivos están las dos líneas base JSON que lee `scripts/compare-phaser-baselines.mjs`, la comparación artística bajo `artifacts/character-template/` y las imágenes enlazadas desde documentos de revisión. Las tres maquetas de `modelos-interfaz/` se pueden excluir de la publicación y conservar para diseño.

La comparación SHA-256 de imágenes y ZIP en `assets/`, `artifacts/` y `modelos-interfaz/` encontró **13 grupos de archivos idénticos**. Guardar una copia por grupo permitiría retirar 14 copias que ocupan **13,91 MB** en la copia de trabajo. Esa cifra ya está incluida en los tamaños de los directorios. Por ejemplo, `artifacts/correcciones/outfit-generated.png` y `assets/modular/outfits/training/source/atlas.png` contienen los mismos bytes. La segunda ruta es la fuente canónica. Antes de retirar la primera, ajustar `artifacts/correcciones/import-outfit.mjs`, que la solicita directamente.

## Orden para ejecutar la limpieza

1. Retirar las 24 trazas antiguas. Completado en `optimizacion`.
2. Excluir del despliegue fuentes de edición y evidencias. Verificar el sitio resultante con rutas de carga directas y dinámicas, incluidos Dojo, combate, viajes y catálogo.
3. Retirar la hoja antigua de sellos y resolver los PNG del HUD que aún referencian las pruebas. Revisar las capas sustituidas y las duplicadas con los scripts de producción antes de moverlas.
4. Comparar tamaño de la copia de trabajo y del paquete publicado por separado. Ejecutar `npm test`, `npm run art:validate` y los recorridos de carga que correspondan. Los archivos de este inventario permanecen disponibles en el commit de referencia.
