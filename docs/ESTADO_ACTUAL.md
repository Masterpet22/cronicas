# Estado actual del proyecto

Este documento es la referencia breve del alcance vigente de *Crónicas del Sello*. La campaña descrita aquí coincide con el código conectado mediante `STORY_SAGAS` y con [`saga-1-tutorial.md`](saga-1-tutorial.md).

## Versión y alcance

- Versión del paquete: `0.45.1`.
- Estado: prototipo jugable con la primera saga disponible y expansión futura planificada.
- Plataforma de juego habilitada: navegador en pantalla de escritorio.
- Guardado: tres partidas locales, esquema `SAVE_VERSION = 16` y migración automática desde la numeración anterior.
- Combate: duelos consecutivos uno contra uno, afinidades, estados, sellos, equipo, técnicas y progresión.

## Contenido jugable vigente

La primera saga se llama **Futuro prometedor** y contiene cinco misiones principales:

1. `m01` — **Tras las huellas del gato**.
2. `m02` — **Asalto al Desfiladero del Cuervo**.
3. `m03` — **El umbral de los cuervos**.
4. `m04` — **El corazón de la guarida**.
5. `m05` — **El jefe de los bandidos**.

También existen dos misiones secundarias conectadas a su progresión:

1. `s01` — **El silencio de Kagemori**.
2. `s02` — **El médico errante**.

El catálogo `MISSIONS` contiene exclusivamente estas cinco misiones principales. `STORY_SAGAS` utiliza los mismos identificadores y es la fuente del orden narrativo.

Las principales se consultan únicamente en el **Cuartel General** y las secundarias únicamente en el **Tablón de Misiones**. Los requisitos pueden cruzar ambos catálogos: completar una principal abre un encargo y completar ese encargo puede habilitar la siguiente principal, sin mezclar sus interfaces.

## Sistemas de contenido

- `src/mission-system.js` evalúa requisitos, estados, tableros, actividades y efectos declarativos.
- `src/dialogues.js` guarda el texto por claves estables y locales; las misiones y NPC solo conservan referencias.
- `src/view-runtime.js` desmonta la vista anterior, aborta sus listeners y elimina overlays antes de montar otra.
- Al abandonar Phaser para una ubicación HTML, la instancia se destruye; no permanece un canvas oculto ejecutándose en segundo plano.
- [`SISTEMA_MISIONES_DIALOGOS.md`](SISTEMA_MISIONES_DIALOGOS.md) es el contrato para añadir requisitos, mecánicas, efectos y traducciones sin condicionales por ID.

## Expansión futura

La campaña crecerá mediante nuevas sagas y misiones después de estabilizar la primera. Los documentos [`HISTORIA_GENERAL.md`](HISTORIA_GENERAL.md) y [`PERSONAJES_Y_EVENTOS.md`](PERSONAJES_Y_EVENTOS.md) describen el relato y el reparto vigentes; no reservan capítulos ni personajes para expansiones todavía no aprobadas.

## Herramientas internas

El botón **PRUEBAS** y la pantalla `renderDebugTools` se conservan durante el desarrollo para preparar estados y entrar directamente a misiones. Son un bloqueador explícito de lanzamiento: deben eliminarse, junto con sus estilos y pruebas de presencia, antes de publicar la versión 1.0.

## Documentos normativos

- Alcance vigente: este documento.
- Diseño de la primera saga: [`saga-1-tutorial.md`](saga-1-tutorial.md).
- Plan de producción: [`../ROADMAP.md`](../ROADMAP.md).
- Arquitectura: [`INDICE_CODIGO.md`](INDICE_CODIGO.md).
- Extensión de contenido: [`SISTEMA_MISIONES_DIALOGOS.md`](SISTEMA_MISIONES_DIALOGOS.md).
- Dirección visual: [`../ART_DIRECTION.md`](../ART_DIRECTION.md).
