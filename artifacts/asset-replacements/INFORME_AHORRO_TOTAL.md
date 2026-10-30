# Informe de ahorro total de imágenes

Fecha: 28 de octubre de 2026.

## Resultado principal

La biblioteca completa de imágenes en `assets/` pasa de **76,10 MB a 68,42 MB**. El ahorro total en disco es **7,68 MB, un 10,09 % menos**. Hay 210 archivos antes y 208 ahora.

Las imágenes activas auditadas pasan de **8,20 MB a 4,40 MB**: **3,80 MB menos por descarga completa del conjunto, un 46,4 % de reducción**.

Incluyendo la eliminación de dos copias antiguas sin uso, el espacio ocupado por estos recursos del juego pasa de **12,08 MB a 4,40 MB**: **7,68 MB liberados, un 63,6 % menos**.

## Alcance y método

- Base anterior al cambio visual: Git `af4b8a0`. Estado nuevo: archivos actuales de la carpeta de trabajo, incluidas las tres últimas conversiones.
- Se comparan los archivos utilizados por el juego, no los JPG que entregó el usuario frente a su conversión WebP.
- Se incluyen 17 fondos/capas activos, 4 iconos/objetos y 2 copias antiguas retiradas. El Santuario de la Luna se incluye con ahorro cero porque sigue activo con el archivo anterior.
- El desglose del cambio de estilo compara los recursos intervenidos. El inventario global de `assets/` sí incluye personajes, efectos y otras imágenes sin cambios. Se excluyen informes, capturas de pruebas, originales externos e historial Git.
- KB y MB son decimales (1.000 y 1.000.000 bytes). MiB se utiliza solo para la estimación de memoria.

## Resumen

| Grupo | Antes | Ahora | Ahorro neto | Reducción |
| --- | ---: | ---: | ---: | ---: |
| 17 fondos y capas activos | 8,05 MB | 4,16 MB | 3,90 MB | 48,4 % |
| 4 iconos y objetos | 0,15 MB | 0,25 MB | -0,09 MB | -60,9 % |
| TOTAL: 21 imágenes activas | 8,20 MB | 4,40 MB | 3,80 MB | 46,4 % |
| TOTAL en disco, incluyendo 2 copias retiradas | 12,08 MB | 4,40 MB | 7,68 MB | 63,6 % |

El valor negativo en iconos/objetos significa que ese grupo creció. Su aumento está descontado del ahorro total; no se presenta únicamente la suma de los archivos que adelgazaron.

## Fondos y capas, archivo por archivo

| Fondo | Antes (KB) | Ahora (KB) | Ahorro (KB) | Reducción |
| --- | ---: | ---: | ---: | ---: |
| Biblioteca | 198,3 | 187,1 | 11,2 | 5,6 % |
| Arena de la aldea | 245,3 | 189,2 | 56,1 | 22,9 % |
| Dojo | 206,3 | 180,6 | 25,7 | 12,4 % |
| Camino del bosque | 388,2 | 235,6 | 152,7 | 39,3 % |
| Cuartel General | 240,6 | 181,6 | 59,0 | 24,5 % |
| Gremio | 246,3 | 204,3 | 42,1 | 17,1 % |
| Kagemori | 366,2 | 204,2 | 161,9 | 44,2 % |
| Tablón de Misiones | 251,4 | 173,9 | 77,6 | 30,9 % |
| Tienda | 252,5 | 155,7 | 96,8 | 38,4 % |
| Torre | 243,1 | 192,2 | 51,0 | 21,0 % |
| Salida de la aldea | 340,0 | 188,8 | 151,2 | 44,5 % |
| Ramas transparentes | 645,4 | 411,3 | 234,1 | 36,3 % |
| Mapa de la aldea | 335,4 | 339,0 | -3,6 | -1,1 % |
| Plaza de Eventos | 303,4 | 194,8 | 108,5 | 35,8 % |
| Paso del Crepúsculo | 784,8 | 156,1 | 628,7 | 80,1 % |
| Marisma de los Juncos | 2147,7 | 104,1 | 2043,6 | 95,2 % |
| Santuario de la Luna (sin reemplazar) | 857,5 | 857,5 | 0,0 | 0,0 % |

## Iconos y objetos

| Recurso | Antes (KB) | Ahora (KB) | Ahorro (KB) |
| --- | ---: | ---: | ---: |
| Golpe veloz | 75,9 | 65,4 | 10,5 |
| Guardia | 74,8 | 89,2 | -14,5 |
| Perrito | 1,1 | 44,6 | -43,6 |
| Silla a Marioneta | 0,8 | 46,0 | -45,3 |

Perrito y silla eran SVG sencillos; las nuevas ilustraciones de Perrito y Marioneta son raster con transparencia. Guardia también aumenta ligeramente. El mapa de la aldea aumenta 3.648 bytes. Todos esos aumentos ya se incluyen en el balance neto.

## Copias retiradas sin uso

| Archivo | Disco liberado | Descarga ahorrada |
| --- | ---: | ---: |
| `assets/locations/kagemori.png` | 3,18 MB | 0 bytes: no se solicitaba |
| `assets/locations/battle-mist-marsh.jpg` | 0,69 MB | 0 bytes: no se solicitaba |

Los JPG/PNG de combate que fueron sustituidos por WebP se cuentan dentro del cambio de formato de cada fondo. No se vuelven a sumar como limpieza independiente.

## Efecto sobre la carga

Estimación matemática de transferencia a **10 Mbps**, sin caché. Solo incluye las imágenes indicadas; no incluye latencia, código, personajes, audio, efectos, decodificación ni renderizado. No son tiempos medidos de apertura del juego.

| Situación | Peso antes | Peso ahora | Transferencia antes | Transferencia ahora |
| --- | ---: | ---: | ---: | ---: |
| Primera misión: fondos del viaje y escenario | 2,16 MB | 0,99 MB | 1,73 s | 0,79 s |
| Desfiladero: fondos del viaje y marisma | 3,52 MB | 0,94 MB | 2,82 s | 0,75 s |
| Suma de las 21 imágenes activas | 8,20 MB | 4,40 MB | 6,56 s | 3,52 s |

El juego carga los fondos por pantalla y misión; no solicita las 21 imágenes al inicio. Las texturas de Phaser ya cargadas se reutilizan durante la sesión. Por eso el ahorro efectivo de cada entrada depende de la ruta y de qué recursos ya estén disponibles. Una reducción del 46,4 % en estos archivos no equivale a que el juego completo abra un 46,4 % más rápido.

## Resolución y memoria estimada

Los 17 fondos/capas ocuparían aproximadamente **98,1 MiB antes y 70,5 MiB ahora** en una única copia RGBA de sus píxeles, un **28,1 % menos**. Es una estimación, no una medición de la RAM/VRAM total ni una afirmación de carga simultánea.

La mayoría de los fondos nuevos conserva su resolución original de 1376 × 768 frente a los aproximadamente 1672 × 941 de los anteriores. Parte del ahorro se debe a esa diferencia de resolución, además del contenido y la codificación.

## Situación pendiente

`assets/locations/battle-moon-shrine.jpg` conserva el estilo anterior y pesa 857.481 bytes; es el único fondo activo pendiente de reemplazo.

Datos exactos y rutas: [total-savings-report.json](total-savings-report.json).


## Biblioteca completa de imágenes en assets/

Incluyendo personajes, efectos, interfaz, iconos y fuentes conservadas que no cambiaron, la biblioteca completa pasa de **76,10 MB (210 archivos)** a **68,42 MB (208 archivos)**. El ahorro neto es **7,68 MB (10,09 %)**. Esta es la reducción del conjunto completo de imágenes en disco, no de una descarga inicial: muchos archivos son fuentes o recursos que se cargan únicamente cuando se necesitan.
