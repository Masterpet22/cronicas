# Crónicas del Sello — Prototipo jugable

RPG 2D por turnos inspirado en los RPG sociales de navegador. La demo incluye una aldea navegable, diez misiones narrativas, progresión persistente, compañero controlado por IA, examen de rango y once rivales únicos.

## Ejecutar

El juego usa Phaser desde un CDN, por lo que necesita conexión a Internet al abrirse.

Desde esta carpeta ejecuta:

```powershell
python -m http.server 8080
```

Después abre `http://localhost:8080` en el navegador.

Si Python no está disponible, cualquier servidor HTTP local puede servir la carpeta. No abras `index.html` mediante `file://`, porque algunos navegadores bloquean la carga de recursos locales.

## Controles

- Crea un personaje con nombre, color de atuendo y afinidad inicial.
- Recorre la aldea desde un mapa ilustrado con nueve destinos interactivos. Cada edificio usa una silueta SVG precisa que se resalta al pasar el cursor o enfocarla con el teclado.
- Cada destino abre como una escena ilustrada: el personaje presenta el lugar mediante un bocadillo y, al terminar, aparecen sus opciones.
- Los habitantes explican controles al explorar las opciones, hacen comentarios ocasionales y pueden recibir un clic para repetir consejos.
- Completa diez misiones en orden; su duración estimada conjunta es de 65 a 85 minutos.
- En el dojo, equipa un arma, un protector, un accesorio y exactamente cuatro jutsus.
- El dojo incluye un creador geométrico: combina cuerpo, rostro, cinco peinados, prendas, calzado, color y arma con vista previa inmediata.
- Las técnicas se desbloquean al subir de nivel; cada nivel entrega dos puntos de atributo.
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
- Cada enemigo concede experiencia y monedas; las recompensas y decisiones quedan guardadas localmente.
- A partir de la tercera misión, Mika ataca automáticamente cada dos rondas.
- La séptima misión es el examen de ascenso al rango Guardián.
- Al finalizar aparece un botón para volver a la aldea y ajustar la estrategia.
- **Modo ligero** desactiva sacudidas y destellos de combatientes para equipos modestos.
- La música ambiental sintetizada puede desactivarse independientemente de los demás efectos.

## Estructura

```text
index.html               Entrada del juego
styles.css               Presentación de la página
game.js                  Escena, combate, sellos y efectos
ART_DIRECTION.md         Guía de identidad, paleta y escalas
src/data.js              Jutsus, equipo, sellos, enemigos y patrones
src/character.js         Definición visual compartida y vista previa SVG
src/save.js              Guardado v3, apariencia, campaña, atributos y recompensas
src/meta-ui.js           Creación, aldea, diálogos, misiones y dojo
src/npcs.js              Reparto, funciones y guías de cada ubicación
src/rules.js             Precisión, afinidades y estados
src/fighters.js          Composición y animación de capas de personaje
src/ui.js                Barras y botones de combate
tests/rules.test.mjs     Pruebas de reglas puras
tests/save.test.mjs      Pruebas de guardado y progresión
assets/sellos-originales.jpg       Nueva hoja de doce símbolos
assets/village/aldea.png           Mapa interactivo de la Aldea del Horizonte
assets/npcs/             Diez retratos transparentes del reparto de la aldea
assets/locations/        Nueve fondos panorámicos para las escenas de cada destino
assets/reference/modular-character-system-v1.png  Hoja técnica del sistema modular
assets/modular/          Experimentos ilustrados archivados; no se cargan en runtime
scripts/generate_modular_assets.ps1  Generador reproducible de personajes
ROADMAP.md               Plan de desarrollo
```

## Pruebas

```powershell
npm test
```

## Nota sobre el arte

El juego utiliza temporalmente figuras geométricas avanzadas para los combatientes con el fin de mantener consistencia y continuar con jugabilidad, animación e interfaz. Los atlas ilustrados se conservan como referencia experimental, pero no se cargan en combate. El mapa de la aldea, la hoja de símbolos, el fondo de la Biblioteca y los retratos originales de Ren y Kureha fueron proporcionados por el usuario; se debe conservar evidencia de su autoría o licencia antes de una publicación comercial o de hacer público el repositorio. Los otros ocho NPC fueron generados específicamente para este prototipo. La procedencia está documentada en `assets/npcs/README.md` y `assets/locations/README.md`.
