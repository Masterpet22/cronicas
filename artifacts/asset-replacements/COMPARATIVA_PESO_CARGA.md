# Comparativa del estilo visual: peso y carga

Base anterior: Git `af4b8a0`. Estado actual: archivos optimizados de la carpeta de trabajo. No se comparan los JPG recibidos con los WebP: se comparan los archivos que el juego utilizaba antes y ahora.

Unidades decimales: 1 KB = 1.000 bytes y 1 MB = 1.000.000 bytes.

## Fondos activos pendientes

| Archivo | Uso | Peso actual |
| --- | --- | ---: |
| `assets/locations/event.webp` | Plaza de Eventos | 303.4 KB |
| `assets/locations/battle-dusk-pass.jpg` | Paso del Crepúsculo; también rutas del médico y cifrado | 784.8 KB |
| `assets/locations/battle-mist-marsh-water.png` | Marisma de los Juncos: escenario de combate | 2147.7 KB |
| `assets/locations/battle-moon-shrine.jpg` | Santuario de la Luna: escenario de combate | 857.5 KB |

La imagen `arena.webp` reemplazada es la Arena de la aldea. Los combates utilizan los tres archivos `battle-*` anteriores.

## Recursos reemplazados

| Fondo | Antes | Ahora | Variación |
| --- | ---: | ---: | ---: |
| Biblioteca | 198.3 KB | 187.1 KB | -5.6 % |
| Arena de la aldea | 245.3 KB | 189.2 KB | -22.9 % |
| Dojo | 206.3 KB | 180.6 KB | -12.4 % |
| Camino del bosque | 388.2 KB | 235.6 KB | -39.3 % |
| Cuartel General | 240.6 KB | 181.6 KB | -24.5 % |
| Gremio | 246.3 KB | 204.3 KB | -17.1 % |
| Kagemori | 366.2 KB | 204.2 KB | -44.2 % |
| Tablón de Misiones | 251.4 KB | 173.9 KB | -30.9 % |
| Tienda | 252.5 KB | 155.7 KB | -38.4 % |
| Torre | 243.1 KB | 192.2 KB | -21.0 % |
| Salida de la aldea | 340.0 KB | 188.8 KB | -44.5 % |
| Ramas transparentes | 645.4 KB | 411.3 KB | -36.3 % |
| Mapa de la aldea | 335.4 KB | 339.0 KB | +1.1 % |
| **Total: 13 recursos reemplazados** | **3.959 MB** | **2.843 MB** | **-28.2 %** |
| **Todos los fondos activos: 17** | **8.052 MB** | **6.937 MB** | **-13.9 %** |

Los cuatro pendientes pesan 4.093 MB y representan 59.0 % del peso actual de los fondos activos. La marisma por sí sola pesa 2,148 MB.

## Carga por situación

Estas duraciones son estimaciones matemáticas a 10 Mbps, con caché fría. Solo incluyen transferencia de los fondos; no incluyen latencia, JavaScript, Phaser, personajes, sonidos, efectos, decodificación ni pintado. No son tiempos medidos de apertura del juego.

| Situación | Antes | Ahora | Descarga antes → ahora a 10 Mbps |
| --- | ---: | ---: | ---: |
| Mapa de la aldea | 0.335 MB | 0.339 MB | 0.27 s → 0.27 s |
| Abrir el Cuartel (solo fondo) | 0.241 MB | 0.182 MB | 0.19 s → 0.14 s |
| Kagemori (solo fondo) | 0.366 MB | 0.204 MB | 0.29 s → 0.16 s |
| Salida y bosque: tres capas | 1.374 MB | 0.836 MB | 1.10 s → 0.67 s |
| Primera misión: viaje y escenario | 2.158 MB | 1.620 MB | 1.73 s → 1.30 s |
| Desfiladero: viaje y marisma | 3.521 MB | 2.983 MB | 2.82 s → 2.39 s |

El juego no descarga los 17 fondos al entrar. El mapa y cada localidad se solicitan al mostrarse o al anticipar un destino con el cursor/teclado. Phaser y las escenas se cargan al iniciar una misión. La escena de viaje solicita salida, bosque, ramas y el escenario de combate correspondiente; las texturas existentes se reutilizan durante esa sesión. El servidor local de pruebas usa `Cache-Control: no-store`, por lo que no debe suponerse caché HTTP persistente tras recargar.

## Resolución y memoria estimada

Doce recursos pasan de aproximadamente 1672 × 941 a 1376 × 768; el mapa de la aldea conserva 1678 × 937. Por tanto, parte del ahorro proviene de usar menor resolución nativa, además del contenido y la codificación. No se amplió artificialmente ninguna imagen nueva.

Un búfer RGBA de los 13 recursos suma aproximadamente 78.0 MiB antes y 54.4 MiB ahora (30.3 % menos). Es una estimación de píxeles, no una medición de la RAM o VRAM total del juego ni una afirmación de que todos estén cargados simultáneamente.

## Copias antiguas sin uso activo

`assets/locations/kagemori.png` y `assets/locations/battle-mist-marsh.jpg` permanecen en disco, pero el código y CSS activos utilizan `kagemori.webp` y `battle-mist-marsh-water.png`. No se cuentan como fondos pendientes ni como descarga actual.

Datos exactos por archivo: [style-weight-comparison.json](style-weight-comparison.json).


## Otros recursos cambiados: iconos y objetos

| Recurso | Antes | Ahora | Variación |
| --- | ---: | ---: | ---: |
| Golpe veloz | 75.9 KB | 65.4 KB | -13.8 % |
| Guardia | 74.8 KB | 89.2 KB | +19.3 % |
| Perrito | 1.1 KB | 44.6 KB | +4136.2 % |
| Silla a Marioneta | 0.8 KB | 46.0 KB | +5967.2 % |

Los 17 recursos cambiados (13 fondos/capas y estos cuatro) pasan de 4.112 MB a 3.089 MB. Los objetos anteriores eran SVG sencillos; los nuevos son ilustraciones raster transparentes, por lo que su tamaño aumenta aunque estén optimizados. Guardia aumenta 14,5 KB respecto al icono anterior.
