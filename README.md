# Crónicas del Sello — prototipo

Vertical slice de combate 2D por turnos inspirada en los RPG sociales de navegador. Incluye cuatro encuentros encadenados, afinidades, sellos interactivos, estados, un jefe de dos fases y opciones de accesibilidad.

## Ejecutar

El juego usa Phaser desde un CDN, por lo que necesita conexión a Internet al abrirse.

Desde esta carpeta ejecuta:

```powershell
python -m http.server 8080
```

Después abre `http://localhost:8080` en el navegador.

Si Python no está disponible, cualquier servidor HTTP local puede servir la carpeta. No abras `index.html` mediante `file://`, porque algunos navegadores bloquean la carga de recursos locales.

## Controles

- Selecciona una de las seis acciones con el ratón o la pantalla táctil.
- Completa los sellos con la cuadrícula de teclado `QWER / ASDF / ZXCV`.
- También puedes pulsar el sello iluminado con ratón o pantalla táctil.
- Una secuencia perfecta aumenta el daño un 10 %; demasiados errores lo reducen.
- Desactiva **Sellos manuales** sobre el juego para ejecutar las secuencias automáticamente; la preferencia queda guardada en el navegador.
- El modo manual no tiene límite de tiempo. Las técnicas ya vistas reproducen sus sellos más rápidamente.
- Puedes regular el volumen y desactivar el movimiento de cámara o los destellos.
- Los jutsus consumen chakra; el personaje recupera 8 puntos al terminar cada ronda.
- La velocidad de la acción decide quién actúa primero en cada ronda.
- **Guardia** recupera 12 puntos de chakra y reduce el siguiente impacto un 50 %.
- Los jutsus tienen enfriamientos visibles y no pueden repetirse continuamente.
- Fuego causa quemadura, viento abre una herida y relámpago aturde; el enemigo puede aplicar veneno.
- Cada ataque compara su precisión con la evasión del objetivo y puede fallar.
- **Sello inhibidor** reduce durante dos rondas la velocidad enemiga en 4 y su precisión en 15 puntos.
- Cada enemigo tiene debilidad, resistencia y patrón de acciones propios.
- Al derrotar un enemigo se recuperan 35 PV y 25 CH antes del siguiente encuentro.
- La técnica especial utiliza una presentación cinematográfica oscura.
- Al finalizar aparece un botón para reiniciar el combate.

## Estructura

```text
index.html               Entrada del juego
styles.css               Presentación de la página
game.js                  Escena, combate, sellos y efectos
src/data.js              Acciones, sellos, enemigos y patrones
src/rules.js             Precisión, afinidades y estados
src/fighters.js          Cuerpos modulares provisionales
src/ui.js                Barras y botones de combate
tests/rules.test.mjs     Pruebas de reglas puras
assets/sellos-ninja.png  Recurso provisional de sellos
ROADMAP.md               Plan de desarrollo
```

## Pruebas

```powershell
npm test
```

## Nota sobre el arte

La cuadrícula de sellos es provisional y debe reemplazarse por arte original antes de una publicación comercial o de hacer público el repositorio. Los combatientes son cuerpos modulares construidos con formas de Phaser y también funcionan como marcadores temporales.
