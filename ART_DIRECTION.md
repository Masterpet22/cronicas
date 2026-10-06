# Dirección visual — Crónicas del Sello

## Principios

La identidad combina tinta seca, siluetas nítidas y color elemental contenido. Los personajes deben seguir siendo legibles a 180–260 px de altura; los efectos pueden ser expresivos, pero nunca deben ocultar vida, chakra o sellos.

## Paleta

- Fondo: azul carbón `#101722`, negro cálido `#090c12`.
- Interfaz y recompensas: ámbar `#f5a357`.
- Vida: jade `#54d69a`; chakra: azul `#58a7ff`.
- Fuego: coral `#ff783d`; viento: menta `#67e8c3`; rayo: azul eléctrico `#68a8ff`.
- Eclipse: ciruela `#612348` y violeta `#9a55df`.

## Personajes base

- **Guardián del Alba:** marfil, carbón y azul medianoche; silueta abierta, orientación hacia la derecha y símbolo solar.
- **Rival de la Sombra:** carbón, ciruela y plata; silueta asimétrica, orientación hacia la izquierda y símbolo lunar.

Ambos son recortes PNG originales con transparencia. Por ahora se animan mediante transformaciones reutilizables: respiración, avance de ataque, pulso de técnica, destello de impacto y caída de derrota. La siguiente iteración deberá separar cabeza, torso, brazos y piernas para obtener animación esquelética sin dibujar cada cuadro.

## Vocabulario de sellos

Las doce posiciones se denominan: Alba, Pulso, Vínculo, Umbral, Flujo, Espiral, Sendero, Nexo, Estallido, Eco, Ruptura y Horizonte. Sus teclas conservan la cuadrícula `QWER / ASDF / ZXCV`.

La hoja `assets/sellos-originales.jpg` fue proporcionada por el usuario. Antes de una publicación comercial o de volver público el repositorio se debe conservar evidencia de autoría o licencia de esa hoja.

## Interfaz y tipografía

- Encabezados: sans serif de sistema, peso 700–850 y espaciado compacto.
- Etiquetas tácticas: mayúsculas pequeñas con espaciado amplio y color ámbar.
- Texto de combate dentro de Phaser: Arial o sans serif equivalente para evitar descargas tipográficas y mantener el arranque ligero.
- Paneles: carbón translúcido, borde frío fino y radio moderado; el ámbar se reserva para acciones y progreso.

## Escala y rendimiento

- Personaje en combate: 255 px de alto.
- Sello normal: 68 px de ancho aproximado; cinematográfico: 92 px.
- No usar vídeo ni animaciones cuadro por cuadro en la demo.
- Mantener el modo ligero sin sacudidas ni destellos para equipos modestos.
