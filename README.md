# Crónicas del Sello — Prototipo jugable

RPG 2D por turnos inspirado en los RPG sociales de navegador. La versión actual incluye una aldea navegable, una primera saga de siete misiones principales y progresión persistente. Nuevas sagas y misiones se incorporarán en futuras etapas del desarrollo.

**Versión pública:** https://masterpet22.github.io/cronicas/

La arquitectura y el flujo de aprobación de la marioneta están documentados en
[`docs/ANIMATION_SYSTEM.md`](docs/ANIMATION_SYSTEM.md).
El mapa completo de archivos, módulos y funciones está en
[`docs/INDICE_CODIGO.md`](docs/INDICE_CODIGO.md).
El alcance jugable vigente, las misiones conectadas y la distinción entre contenido actual e ideas futuras están en
[`docs/ESTADO_ACTUAL.md`](docs/ESTADO_ACTUAL.md).
El contrato para añadir misiones, mecánicas y traducciones sin acoplarlas a una pantalla está en
[`docs/SISTEMA_MISIONES_DIALOGOS.md`](docs/SISTEMA_MISIONES_DIALOGOS.md).
Las fórmulas y objetivos de progresión y combate están en
[`docs/BALANCE_COMBATE.md`](docs/BALANCE_COMBATE.md).

## Ejecutar

Phaser 4.2.1 está incluido localmente en el proyecto. Para servir el juego:

Desde esta carpeta ejecuta:

```powershell
python -m http.server 8080
```

Después abre `http://localhost:8080` en el navegador.

Si Python no está disponible, cualquier servidor HTTP local puede servir la carpeta. No abras `index.html` mediante `file://`, porque algunos navegadores bloquean la carga de recursos locales.

## Controles

- Crea un personaje eligiendo nombre, género y afinidad inicial, con la misma vista previa de Apariencia. El peinado se ajusta después en el Dojo.
- Recorre la aldea desde un mapa ilustrado con nueve destinos interactivos. Cada edificio usa una silueta SVG precisa que se resalta al pasar el cursor o enfocarla con el teclado.
- Cada destino abre como una escena ilustrada: el personaje presenta el lugar mediante un bocadillo y, al terminar, aparecen sus opciones.
- Los habitantes explican controles al explorar las opciones, hacen comentarios ocasionales y pueden recibir un clic para repetir consejos.
- Los bocadillos identifican siempre al hablante y su función; cuando hay varios personajes, el activo se ilumina mientras los demás quedan atenuados.
- El perfil, el regreso al mapa y los ajustes funcionan como HUD flotante; ya no ocupan una cabecera separada del escenario.
- La campaña disponible contiene siete misiones principales: **Tras las huellas del gato**, **El silencio de Kagemori**, **Asalto al Desfiladero del Cuervo**, **El médico errante**, **El umbral de los cuervos**, **El corazón de la guarida** y **El jefe de los bandidos**.
- Los viajes de cada misión muestran su destino y el resultado del regreso con parallax, partículas ambientales y movimiento de cámara de Phaser 4. Al volver, el personaje, el escenario y la ruta avanzan de derecha a izquierda. Entre rivales aparece la siguiente fase de la misión, y los jefes anuncian sus cambios de fase antes de reanudar el combate. El informe se funde antes de volver a la aldea; con movimiento reducido se usa una transición más breve.
- Kagemori y la búsqueda de Haru forman parte de la historia principal del Cuartel. Las misiones futuras permanecen ocultas hasta descubrirse; el Tablón se reserva para encargos opcionales.
- Este contenido forma la primera saga; el plan es ampliarlo con nuevas sagas y misiones más adelante.
- La tienda permite comprar y vender armas, sellos, accesorios, apariencias, sustituciones, consumibles, pergaminos y contratos. La venta devuelve la mitad del precio unitario, redondeada hacia abajo; exige desequipar primero y no permite vender contratos durante su misión.
- **Dojo → Equipo** contiene arma, sello, accesorio y compañero. Solo ofrece objetos poseídos. Las antiguas protecciones se convierten en sellos; las compras de trajes anteriores conservan su apariencia y reciben el sello equivalente.
- **Dojo → Apariencia** gestiona rostro, peinado, sustitución, parte superior, inferior, calzado y traje completo, usando las compras del personaje. La ropa común es cosmética. Los trajes especiales indican su efecto: el ceremonial del canalizador añade 15 de chakra. Los gráficos de prendas y rostros siguen pendientes y se indica en el catálogo; los peinados y objetos de sustitución usan los recursos existentes.
- Los objetos de **Sustitución** (tronco, perrito y marioneta) son selecciones permanentes: no se gastan al usarlos. El tronco es gratuito y las demás opciones se compran.
- La segunda afinidad se abre por progreso en nivel 15/rango elemental 2, o al ser **Guardián con nivel 10**. El **pergamino de afinidad** requiere Guardián, al menos nivel 10 y dos afinidades activas para elegir la tercera. Las partidas antiguas conservan su tercera afinidad.
- Los contratos de la tienda aparecen en el **Tablón de Misiones**. **El sello extraviado** entrega el Sello del guardián; **El pacto del sabueso** desbloquea al Sabueso del horizonte, una invocación equipable que aporta +3 precisión y +2 suerte. La licencia se consume al completar el contrato; las recompensas se entregan una sola vez y se guardan al confirmar la victoria.
- En combate, abre **Mochila** durante tu turno para usar pociones de vida/chakra, un tónico purificador o un elixir. Usar un consumible gasta el turno; no se consume si no tiene efecto. Los objetos gastados no reaparecen al retirarte o reintentar y no adelantan el cobro de recompensas.
- Cada misión conserva dos reintentos gratuitos. Al agotarlos, un **pergamino de reintento** permite repetir el duelo perdido con ambos combatientes recuperados.
- Las compras y ventas se guardan por personaje. El equipo inicial vendido no reaparece al recargar. El tipo de cuerpo se fija al crear cada partida.
- Las ranuras de técnicas se desbloquean en los niveles 1, 5 y 8; cada técnica exige también experiencia de afinidad obtenida en combate.
- Selecciona una de las seis acciones con el ratón o las teclas `1–6` indicadas en cada acción.
- Completa los sellos con la cuadrícula de teclado `QWER / ASDF / ZXCV`.
- También puedes pulsar el sello iluminado con el ratón.
- Al cerrar una misión, primero se representa el regreso a la aldea y después aparece un informe de pergamino a pantalla completa, marcado con `APROBADO`, `ABANDONADO` o `FALLIDA`.
- Una secuencia perfecta aumenta el daño un 10 %; demasiados errores lo reducen.
- Desactiva **Sellos manuales** sobre el juego para ejecutar las secuencias automáticamente; la preferencia queda guardada en el navegador.
- El modo manual no tiene límite de tiempo. Las técnicas ya vistas reproducen sus sellos más rápidamente.
- Puedes regular el volumen y desactivar el movimiento de cámara o los destellos.
- Los jutsus consumen chakra; el personaje recupera 8 puntos al completar una acción propia.
- Jugador y enemigo avanzan de forma independiente por una línea temporal según su velocidad efectiva.
- Al llegar al 80 % se habilita la acción; las técnicas con preparación recorren el tramo 80–100 % mientras el rival sigue avanzando.
- La elección del jugador usa modo de espera: la línea temporal se pausa en el 80 % y vuelve a correr al confirmar la acción.
- La barra responde con crestas y pinceladas ilustradas; la preparación cambia la postura, respeta la profundidad de las manos y genera motas caligráficas con emisores reales. La fase II del jefe se distingue mediante una silueta animada, sin círculos ni un modo furia inventado.
- **Guardia** recupera 12 puntos de chakra y reduce el siguiente impacto un 50 %.
- Los jutsus tienen enfriamientos visibles y no pueden repetirse continuamente.
- Fuego causa quemadura, viento abre una herida y relámpago aturde; el enemigo puede aplicar veneno.
- Las técnicas elementales muestran impactos propios de fuego, agua, tierra, viento y rayo; en WebGL añaden brillo de Phaser 4 y en modo ligero o con movimiento reducido conservan una versión simple.
- Cada ataque compara su precisión con la evasión del objetivo y puede fallar.
- El estado **Sellado** reduce en 15 puntos la precisión mientras permanece activo.
- Cada enemigo tiene debilidad, resistencia y patrón de acciones propios.
- Al derrotar un enemigo se recupera el 22 % de los PV máximos y el 18 % del chakra máximo antes del siguiente encuentro (mínimo 12 de cada recurso).
- La técnica especial utiliza una presentación cinematográfica oscura.
- Cada enemigo concede experiencia y monedas según su dificultad en la primera victoria de la misión. Repetirla no vuelve a dar experiencia ni monedas.
- Si la experiencia de un rival alcanza el siguiente nivel, el personaje destella con luz blanca y pasa entre humo a una ventana con los atributos anteriores y nuevos. Al aceptar, el humo devuelve al combate si quedan rivales. Los aumentos dependen de la afinidad principal y se aplican provisionalmente; experiencia, monedas y niveles sólo se guardan al cerrar el informe y llegar a la aldea. Abandonar pide confirmación y descarta esas recompensas.
- Al finalizar aparece un botón para volver a la aldea y ajustar la estrategia.
- **Resolución de combate**, en Ajustes y en Pausa, permite elegir Automática, 540p, 675p, 810p o 1080p. La elección manual se guarda y cambia el lienzo al instante sin reiniciar la batalla. Automática ajusta la resolución al equipo y al tamaño de la ventana.
- **Modo ligero** reduce efectos, sacudidas y destellos de forma independiente de la resolución; puede activarse o desactivarse desde la pausa.
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
docs/saga-1-tutorial.md  Diseño de las siete misiones de la primera saga
tests/rules.test.mjs     Pruebas de reglas puras
tests/save.test.mjs      Pruebas de guardado y progresión
assets/sellos-constelaciones.png   Hoja optimizada de doce sellos agrupados por elemento
assets/village/aldea.webp          Mapa WebP interactivo de la Aldea del Horizonte
assets/npcs/             Doce retratos WebP transparentes del reparto y Kagemori
assets/locations/        Nueve fondos WebP panorámicos para las escenas de cada destino
assets/elements/         Sistema de 22 iconos elementales en cuatro niveles
assets/vfx/feedback/     Crestas, pinceladas, cintas y motas transparentes para feedback de combate
assets/ui/results/       Pergamino y sello de tinta de la pantalla de resultados
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

Para la línea base visual y de rendimiento de Phaser 4:

```powershell
npm run performance:test
npm run performance:baseline
```

En **PRUEBAS → Medir rendimiento** se activa el panel opcional de FPS, tiempos de frame,
resolución y presupuestos por escena, con exportación JSON. El benchmark genera las
27 muestras y referencias visuales en `artifacts/phaser-performance/`.
El protocolo, los límites y la interpretación de resultados están en
[`docs/RENDIMIENTO_PHASER_4.md`](docs/RENDIMIENTO_PHASER_4.md).

Las tres arenas usan perfiles declarativos de ambiente, niebla, viñeta, partículas y cámara,
con variantes sin filtros para Canvas, modo ligero y movimiento reducido. Se verifican con
`npm run arenas:test`, `npm run arenas:verify` y `npm run arenas:benchmark`; véase
[`docs/PERFILES_VISUALES_ARENAS.md`](docs/PERFILES_VISUALES_ARENAS.md).

La plantilla artística común se audita con `npm run art:validate`. El contrato JSON y la guía
SVG son candidatos técnicos; la [validación artística](docs/VALIDACION_PLANTILLA_ARTISTICA.md)
detalla qué coincide entre Dojo y combate y qué impide aprobar todavía el arte definitivo.

## Escenario de escritorio

Todas las vistas comparten un escenario lógico de `1440 × 810` píxeles (`16:9`). El marco se centra y escala de forma proporcional en pantallas de escritorio, mientras que en monitores grandes conserva su tamaño máximo.

## Nota sobre el arte

El combate utiliza temporalmente marionetas raster articuladas construidas con las piezas de `assets/modular/man_sprites/runtime/` y `assets/modular/woman_sprites/runtime/`; el tipo elegido al crear el perfil determina cuál se usa. La vista previa personalizable del Dojo todavía solo traslada el cuerpo y el peinado a esa marioneta; los demás atlas de personalización ilustrada se conservan como referencia experimental. El mapa de la aldea, la hoja de símbolos, el fondo de la Biblioteca y los retratos originales de Ren y Kureha fueron proporcionados por el usuario; se debe conservar evidencia de su autoría o licencia antes de una publicación comercial o de hacer público el repositorio. Los otros diez NPC fueron generados específicamente para este prototipo. La procedencia está documentada en `assets/npcs/README.md` y `assets/locations/README.md`.
