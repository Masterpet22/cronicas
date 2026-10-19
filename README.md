# Crónicas del Sello — Prototipo jugable

RPG 2D por turnos inspirado en los RPG sociales de navegador. La demo incluye una aldea navegable, una primera saga de cinco misiones principales, dos misiones secundarias y progresión persistente. Nuevas sagas y misiones se incorporarán en futuras etapas del desarrollo.

**Demo pública:** https://masterpet22.github.io/cronicas/

La arquitectura y el flujo de aprobación de la marioneta están documentados en
[`docs/ANIMATION_SYSTEM.md`](docs/ANIMATION_SYSTEM.md).
El mapa completo de archivos, módulos y funciones está en
[`docs/INDICE_CODIGO.md`](docs/INDICE_CODIGO.md).
El alcance jugable vigente, las misiones conectadas y la distinción entre contenido actual e ideas futuras están en
[`docs/ESTADO_ACTUAL.md`](docs/ESTADO_ACTUAL.md).
El contrato para añadir misiones, mecánicas y traducciones sin acoplarlas a una pantalla está en
[`docs/SISTEMA_MISIONES_DIALOGOS.md`](docs/SISTEMA_MISIONES_DIALOGOS.md).

## Ejecutar

Phaser está incluido en el proyecto. Para servir el juego localmente:

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
- Los bocadillos identifican siempre al hablante y su función; cuando hay varios personajes, el activo se ilumina mientras los demás quedan atenuados.
- El perfil, el regreso al mapa y los ajustes funcionan como HUD flotante; ya no ocupan una cabecera separada del escenario.
- La campaña disponible contiene cinco misiones principales: **Tras las huellas del gato**, **Asalto al Desfiladero del Cuervo**, **El umbral de los cuervos**, **El corazón de la guarida** y **El jefe de los bandidos**.
- Las misiones secundarias disponibles son **El silencio de Kagemori** y **El médico errante**. Sus decisiones y descubrimientos abren el progreso de la saga principal.
- Este contenido forma la primera saga; el plan es ampliarlo con nuevas sagas y misiones más adelante.
- En el dojo, equipa o desequipa un arma, un protector y un accesorio.
- La afinidad principal se elige al crear el personaje. La historia permite conocer otras y el nivel y rango elemental abren hasta tres espacios ponderados.
- Cada una de las tres partidas fija el tipo de cuerpo al crear al personaje; el Dojo permite ajustar rostro, cinco peinados, prendas, calzado, color y arma con vista previa inmediata.
- Las ranuras de técnicas se desbloquean en los niveles 1, 5 y 8; cada técnica exige también experiencia de afinidad obtenida en combate.
- Selecciona una de las seis acciones con el ratón o las teclas `1–6` indicadas en cada acción.
- Completa los sellos con la cuadrícula de teclado `QWER / ASDF / ZXCV`.
- También puedes pulsar el sello iluminado con el ratón.
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
- El estado **Sellado** reduce en 15 puntos la precisión mientras permanece activo.
- Cada enemigo tiene debilidad, resistencia y patrón de acciones propios.
- Al derrotar un enemigo se recuperan 35 PV y 25 CH antes del siguiente encuentro.
- La técnica especial utiliza una presentación cinematográfica oscura.
- Cada enemigo concede experiencia y monedas; las recompensas y decisiones quedan guardadas localmente.
- Al finalizar aparece un botón para volver a la aldea y ajustar la estrategia.
- **Modo ligero** desactiva sacudidas y destellos de combatientes para equipos modestos.
- La música ambiental sintetizada puede desactivarse independientemente de los demás efectos.

## Estructura

Este resumen conserva los nombres físicos necesarios para los imports. Consulta
[`docs/INDICE_CODIGO.md`](docs/INDICE_CODIGO.md) para sus nombres funcionales en español y el inventario detallado.

```text
index.html               Entrada del juego
styles.css               Presentación de la página
game.js                  Entry point y bootstrap de Phaser (121 líneas)
ART_DIRECTION.md         Guía de identidad, paleta y escalas
src/data.js              Jutsus, equipo, sellos, enemigos y patrones (sin misiones)
src/content/              Sagas, misiones, diálogos y datos específicos
src/battle/               Runtime, lógica pura, BattleState y escenas Phaser
src/character.js         Definición visual compartida y vista previa SVG
src/save.js              Fachada del guardado v17 y API de progresión
src/save/                 Migraciones, estado de campaña/personaje y ranuras
src/mission-system.js    Requisitos, estados, efectos y validación del catálogo de misiones
src/dialogues.js         Catálogo de diálogos de NPC y resolución de claves de misión
src/view-runtime.js      Montaje exclusivo y desmontaje de vistas y overlays
src/meta-ui.js           Orquestación del metajuego (298 líneas)
src/ui/meta/views/        Vistas aisladas de aldea, misiones, dojo y archivo
src/npcs.js              Reparto, funciones y guías de cada ubicación
src/rules.js             Precisión, afinidades y estados
src/fighters.js          Composición y animación de capas de personaje
src/ui.js                Barras y botones de combate
docs/INDICE_CODIGO.md    Índice en español de archivos, módulos y funciones
docs/ESTADO_ACTUAL.md    Alcance vigente y campaña realmente conectada
docs/SISTEMA_MISIONES_DIALOGOS.md  Contrato extensible de misiones, diálogos y vistas
docs/METRICAS.md          Línea base final de arquitectura y calidad
docs/saga-1-tutorial.md  Diseño de la primera saga y sus dos secundarias
tests/rules.test.mjs     Pruebas de reglas puras
tests/save.test.mjs      Pruebas de guardado y progresión
assets/sellos-originales.webp      Hoja WebP optimizada de doce símbolos
assets/village/aldea.webp          Mapa WebP interactivo de la Aldea del Horizonte
assets/npcs/             Doce retratos WebP transparentes del reparto y Kagemori
assets/locations/        Nueve fondos WebP panorámicos para las escenas de cada destino
assets/elements/         Sistema de 22 iconos elementales en cuatro niveles
assets/reference/modular-character-system-v1.png  Hoja técnica del sistema modular
assets/modular/          Capas, atlas y piezas utilizadas por el personaje modular
scripts/generate_modular_assets.ps1  Generador reproducible de personajes
ROADMAP.md               Plan de desarrollo
```

## Pruebas

```powershell
npm test
npm run smoke
npm run metrics
```

## Escenario de escritorio

Todas las vistas comparten un escenario lógico de `1440 × 810` píxeles (`16:9`). El marco se centra y escala de forma proporcional en pantallas de escritorio, mientras que en monitores grandes conserva su tamaño máximo.

## Nota sobre el arte

El combate utiliza temporalmente una marioneta raster articulada construida con las piezas de `assets/modular/man_sprites/runtime/`. La vista previa personalizable del Dojo todavía no está integrada en esa marioneta; los atlas de personalización ilustrada se conservan como referencia experimental. El mapa de la aldea, la hoja de símbolos, el fondo de la Biblioteca y los retratos originales de Ren y Kureha fueron proporcionados por el usuario; se debe conservar evidencia de su autoría o licencia antes de una publicación comercial o de hacer público el repositorio. Los otros diez NPC fueron generados específicamente para este prototipo. La procedencia está documentada en `assets/npcs/README.md` y `assets/locations/README.md`.
