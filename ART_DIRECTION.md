# Dirección visual — Crónicas del Sello

## Principios

La identidad combina tinta seca, siluetas nítidas y color elemental contenido. Los personajes deben seguir siendo legibles a 180–260 px de altura; los efectos pueden ser expresivos, pero nunca deben ocultar vida, chakra o sellos.

## Paleta

- Fondo: azul carbón `#101722`, negro cálido `#090c12`.
- Interfaz y recompensas: ámbar `#f5a357`.
- Vida: jade `#54d69a`; chakra: azul `#58a7ff`.
- Fuego: coral `#ff783d`; viento: menta `#67e8c3`; rayo: azul eléctrico `#68a8ff`.
- Bandidos del Cuervo: ciruela oscura `#4b3341` y granate `#6d3e48`.

## Sistema modular de personajes

La hoja `assets/reference/modular-character-system-v1.png` define la plantilla de producción:

- Anime/chibi moderado, aproximadamente una cabeza por 3,5 alturas.
- Pose neutral en vista 3/4 frontal.
- Cuerpo masculino y femenino con la misma escala, línea de pies y anclajes.
- Capas para cabello trasero, cuerpo, rostro, ropa superior e inferior, manos, cabello delantero, accesorio, arma y efectos.
- Anclajes `HEAD`, `NECK`, `SHOULDER_L/R`, `HAND_L/R`, `WAIST`, `FOOT_L/R` y `WEAPON_HAND`.

El renderer activo de combate utiliza marionetas raster articuladas construidas por `src/fighters.js` con las piezas de `assets/modular/man_sprites/runtime/` y `assets/modular/woman_sprites/runtime/`. El perfil del jugador selecciona el cuerpo masculino o femenino; los rivales conservan provisionalmente el masculino. Rostro, ropa, calzado, color y arma todavía no se trasladan a la marioneta de combate.

Los atlas de personalización de `assets/modular/` son experimentos archivados y no se cargan durante el juego. Las excepciones son los directorios `runtime/` de las marionetas masculina y femenina y los peinados aprobados. Ninguno debe considerarse arte modular terminado: las demás variantes generadas no comparten todavía una anatomía suficientemente estricta.

La revisión reproducible está en [`docs/VALIDACION_PLANTILLA_ARTISTICA.md`](docs/VALIDACION_PLANTILLA_ARTISTICA.md).
`assets/reference/character-template-v1.json` y su guía `.svg` definen una candidata técnica
de maestro común 2048×2048; no son una aprobación artística ni el contrato de los atlas
experimentales 768×768. Antes de exportar el vestuario definitivo se deben producir ambos
maestros normalizados y verificar su correspondencia y orden de dibujo en Dojo y combate.

## Vocabulario de sellos

Los doce sellos son constelaciones agrupadas por afinidad: Ara, Fornex y Phoenix para Fuego; Cetus, Delphinus y Eridanus para Agua; Bootes, Ursa Major y Virgo para Tierra; Aquila, Cygnus y Pegasus para Viento. Sus teclas conservan el conjunto `QWER / ASDF / ZXCV`.

La hoja optimizada `assets/sellos-constelaciones.png` procede de los recursos proporcionados por el usuario en carpetas separadas por elemento. Antes de una publicación comercial o de volver público el repositorio se debe conservar evidencia de autoría o licencia de esas imágenes.

## Interfaz y tipografía

- Encabezados: Cinzel 600–700, reservada para títulos y rótulos de al menos 14 px.
- Lectura, controles y combate: Alegreya Sans 400–700, con un suelo de 12 px para información útil y 13 px para acciones.
- Etiquetas tácticas: mayúsculas breves con espaciado contenido y acentos ámbar o azul celeste.
- Superficies: tinta azul-negra translúcida, divisores finos y acentos luminosos. Se evitan cajas marrones anidadas; el pergamino ilustrado se reserva para el marco exterior.
- El metajuego y Phaser comparten las mismas familias tipográficas y jerarquía de color.

## Escala y rendimiento

- Personaje en combate: aproximadamente 220–255 px de alto.
- Sello normal: 68 px de ancho aproximado; cinematográfico: 92 px.
- No usar vídeo ni animaciones cuadro por cuadro en la demo.
- Mantener el modo ligero sin sacudidas ni destellos para equipos modestos.
