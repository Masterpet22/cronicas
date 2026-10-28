# Reemplazo de imágenes — 28 de octubre de 2026

Los cinco archivos entregados se integraron en el juego. Los originales en `D:/Descargas` se conservaron.

| Original | Archivo utilizado por el juego | Tamaño | Peso |
| --- | --- | --- | --- |
| `basic-strike.jfif` | `assets/actions/basic-strike.webp` | 512 × 512 | 65.394 bytes |
| `guard.jfif` | `assets/actions/guard.webp` | 512 × 512 | 89.212 bytes |
| `teleport-dog.jfif` | `assets/vfx/teleport-dog.webp` | 460 × 520 | 44.650 bytes |
| `teleport-marioneta.jfif` | `assets/vfx/teleport-puppet.webp` | 800 × 220 | 46.050 bytes |
| `aldea.jpg` | `assets/village/aldea.webp` | 1678 × 937 | 339.048 bytes |

Total para el juego: **584.354 bytes**, frente a **8.936.265 bytes** de los originales (93,5 % menos). Las cuatro ilustraciones tienen transparencia real. Los recortes se ajustaron sin estirarlos a sus lienzos de ejecución. El mapa conserva el sistema de coordenadas de los nueve destinos. Se actualizaron las versiones de los recursos para renovar la caché del navegador.

La opción **Marioneta** sustituye a **Silla** en el Dojo y en las animaciones. Las partidas con `character.teleportObject = "chair"` se normalizan a `puppet`.

## Procesamiento

Se utilizó el modo incorporado de `image_gen` para extraer el fondo de cada ilustración por separado. No se utilizó la API ni el CLI de generación. Después se ejecutó `scripts/prepare_replacement_assets.py` para recortar márgenes transparentes, ajustar las dimensiones y codificar WebP (calidad 90 para las ilustraciones, 88 para el mapa; alfa preservado sin pérdida y metadatos eliminados).

Los parámetros concretos y las rutas de los recortes están en [processing-report.json](processing-report.json). Vista del mapa integrado: [aldea-actualizada.png](aldea-actualizada.png).

Vistas comprobadas: [marioneta en juego](marioneta-en-juego.png), [perrito en juego](perrito-en-juego.png) y [selector del Dojo](marioneta-dojo.png). Pasaron la suite `npm test`, la navegación de las nueve localidades y las seis pruebas de `transportation.spec.mjs`.

## Prompts de extracción

Se aplicó este prompt a cada archivo indicado, con `transparent_background: true` y una única imagen de entrada:

```text
Use case: background-extraction. Edit target: the supplied image. Remove ONLY the plain white background and export with real transparent alpha. Preserve {subject} exactly as supplied: identical pose, proportions, outlines, colors, textures, expression, lighting, and composition. Do not redraw, stylize, invent, add shadows or modify the artwork. Preserve internal white highlights as opaque artwork; only empty background and gaps should be transparent. Clean antialiased edges without white fringe. Keep every part of the artwork visible, without cropping it. This is a faithful game-asset cutout, no text, no new objects.
```

Valores de `{subject}`:

- `basic-strike.jfif`: `the fist, torn dark sleeve and orange curved strike energy`
- `guard.jfif`: `both crossed forearms and fists, torn sleeves, cloth wraps, blue and gold defensive energy, and all small colored sparks`
- `teleport-dog.jfif`: `the entire sitting brown puppy, including ears, tail, paws, red bandana, highlights and face`
- `teleport-marioneta.jfif`: `the entire wooden puppet lying horizontally, including its head, clothes, bent leg, hands, and feet`

El mapa no pasó por generación de imágenes: se convirtió directamente desde `aldea.jpg`.

## Fondos del Cuartel General y Kagemori

También se reemplazaron `assets/locations/headquarters.webp` y `assets/locations/kagemori.webp` desde los dos JPG entregados. Se convirtieron directamente a WebP con el optimizador del proyecto, calidad 86 y sin generación de imágenes, recortes ni ampliación. Ambos conservan sus **1376 × 768 píxeles** originales.

| Original | Peso original | WebP final | PSNR |
| --- | --- | --- | --- |
| `headquarters.jpg` | 815.542 bytes | 181.624 bytes | 39,03 dB |
| `kagemori.jpg` | 865.915 bytes | 204.228 bytes | 39,02 dB |

Total: **1.681.457 → 385.852 bytes**, un **77,1 % menos**. Se renovaron las versiones de caché del metajuego y del recurso compartido de Kagemori. [Informe de procesamiento](location-backgrounds-report.json).

Vistas integradas: [Cuartel General](cuartel-actualizado.png) y [Kagemori](kagemori-actualizada.png). Pasaron la suite general y las dos pruebas del Cuartel y Kagemori, incluida la investigación completa con sus tres zonas interactivas.

## Diez fondos del nuevo estilo visual

Se reemplazaron los fondos `archive`, `arena`, `dojo`, `forest-road`, `inn`, `missions`, `shop`, `tower`, `village-outskirts` y `village-outskirts-branches` en `assets/locations/`. Todos utilizan **1376 × 768 píxeles**, conservando el encuadre panorámico de los originales entregados.

Los nueve fondos opacos se convirtieron directamente desde sus JPG mediante el optimizador del proyecto (WebP, calidad 86, metadatos eliminados). Las ramas se procesaron con el modo incorporado de `image_gen` para eliminar el fondo blanco y los huecos entre hojas, y se exportaron como WebP de calidad 90 con alfa sin pérdida. Se conserva el lienzo completo para que la capa de profundidad permanezca alineada durante los viajes.

Peso total de estos diez originales: **7.960.956 bytes**. Peso utilizado por el juego: **2.118.530 bytes**, un **73,4 % menos**. Los originales se conservaron y se renovaron las versiones de caché. [Informe por archivo](visual-style-backgrounds-report.json).

Vistas integradas: [Dojo](nuevo-fondo-dojo.png), [Biblioteca](nuevo-fondo-biblioteca.png), [bosque con ramas transparentes](nuevo-bosque-parallax.png) y [viaje a una misión](nueva-salida-mision.png). Pasaron `npm test` y las siete comprobaciones de carga diferida, navegación de la aldea, salida, regreso y transición entre rivales. Se actualizaron dos expectativas antiguas del test de viajes para reflejar el catálogo vigente: `m05` es la misión 7 y `s01` es principal.

Prompt de extracción usado exclusivamente para `village-outskirts-branches.jpg`, con `transparent_background: true`:

```text
Use case: background-extraction. Edit target: the supplied horizontal game foreground overlay. Remove ONLY the plain white background and all white gaps between the leaves and branches; output genuine transparent alpha. Preserve the supplied artwork faithfully: the same pine branches and needles, red maple leaves, dark twigs, shapes, colors, highlights, linework, and framing at the top, left and right edges. Keep their exact relative positions, full landscape canvas, aspect ratio and generous empty center and lower center; this overlay must register with the original 1376 by 768 canvas. DO NOT crop to the artwork bounds, rearrange, move, redraw, stylize or add branches. The branches at the canvas edges must stay at those same edges. Preserve internal light colored highlights as opaque artwork, but eliminate the white backdrop including its enclosed gaps. Clean antialiased edges without white fringe. No replacement background, no shadows, no text, no new objects.
```
