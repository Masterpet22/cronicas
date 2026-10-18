# Índice del código de Crónicas del Sello

Este documento asigna un nombre funcional en español a cada archivo importante y explica sus responsabilidades. Los nombres físicos se conservan para no romper imports ES Modules, URLs, pruebas ni ramas de trabajo existentes.

El alcance funcional vigente y la lista canónica de misiones están en [`ESTADO_ACTUAL.md`](ESTADO_ACTUAL.md).
El contrato de extensión de misiones, pasos y diálogos está en [`SISTEMA_MISIONES_DIALOGOS.md`](SISTEMA_MISIONES_DIALOGOS.md).

## Flujo general

```text
index.html
  └─ game.js
      ├─ src/meta-ui.js ── aldea, personaje, dojo y misiones
      ├─ src/data.js ───── catálogo de contenido
      ├─ src/mission-system.js ─ requisitos y flujo de misiones
      ├─ src/dialogues.js ─ catálogo traducible de diálogos
      ├─ src/view-runtime.js ─ ciclo de vida exclusivo de pantallas
      ├─ src/save.js ───── guardado y progresión
      ├─ src/doctor-mission.js ─ rutas convergentes de Haru
      ├─ src/affinity-system.js ─ afinidades y modificadores de combate
      ├─ src/rules.js ──── reglas puras de combate
      ├─ src/fighters.js ─ combatientes y animación
      ├─ src/ui.js ─────── barras, acciones y ayudas
      └─ src/animations/* ─ rig, clips, controlador, muestreo y validación
```

## Archivos de entrada y presentación

| Archivo | Nombre funcional en español | Responsabilidad |
| --- | --- | --- |
| `index.html` | Entrada principal | Carga fuentes y estilos, decide si habilita la experiencia y, cuando corresponde, inicia Phaser y el módulo del juego. |
| `game.js` | Orquestador del juego | Configura Phaser y contiene las escenas de viaje, combate y pausa. |
| `styles.css` | Estilos generales | Presentación de acceso, creación de personaje, aldea, ubicaciones, dojo, diálogos, misiones y herramientas internas. |
| `desktop.css` | Diseño de escritorio | Adapta la interfaz al escenario lógico de escritorio y sus resoluciones. |
| `package.json` / `package-lock.json` | Configuración del proyecto | Versión, dependencia fija de iconos y comando de pruebas. |

## Orquestador de escenas: `game.js`

Funciones generales:

- `configureRenderResolution`: calcula el framebuffer físico sin cambiar el lienzo lógico de 960 × 540.
- `sharpenTextTree`: aumenta la resolución interna de los textos de Phaser.
- `drawCubicBezier`: dibuja curvas cúbicas usadas por la guía lateral de acciones.
- `bindGlobalOptions`: restaura y persiste las preferencias globales del juego.

Escena `MissionTravelScene`:

- `preload`: carga el fondo y las texturas del combatiente.
- `create`: representa la transición de ida o regreso entre la aldea y una misión.

Escena `BattleScene`:

- Preparación: `preload`, `create`, `configureSealMode`, `configurePresentationOptions`, `createEnemyState`, `chooseEnemyAction` y `makeSealFrames`.
- Escenario: `drawArena`, `drawDuskPass`, `drawMistMarsh` y `drawMoonShrine`.
- HUD: `createHud`, `registerHudThemeFrames`, `applyHudTheme`, `moveHudBar`, `createTurnTimeline` y `createPauseButton`.
- Combatientes y acciones: `createFighters`, `createActionPanel`, `startTurnCharge`, `resetTurnTimeline`, `useJutsu`, `playerAttack`, `playerGuard`, `executeEnemyAction` y `enemyTurn`.
- Sellos: `playSeals` y `waitForSealInput`.
- Resolución del combate: `resolveEnemyOutcome`, `advanceEncounter`, `triggerBossPhaseTwo`, `rollHit`, `resolveEndRoundStatuses`, `advanceCooldowns`, `clearGuard`, `loseHealth` y `finishBattle`.
- Efectos: `createImpact`, `flashFighter`, `stopFighterFlash`, `floatHealthLoss`, `healthLossPulse`, `floatLabel`, `shake`, `screenFlash`, `tone` y `startMusic`.
- Actualización: `setButtonsEnabled`, `refreshHud`, `updateHealthBar`, `setMessage`, `setSealPrompt`, `actionCost`, `playerAppearance`, `textStyle`, `sharpenSceneText`, `tween` y `delay`.

Escena `PauseScene`:

- `create`: compone el menú de pausa.
- `makePauseToggle`, `makeVolumeControl`, `makeHudThemeControl` y `makePauseAction`: crean los controles reutilizables del menú.

## Módulos de `src`

### `src/data.js` — Catálogo de contenido

- `SEALS`: doce sellos y sus teclas.
- `BASE_ACTIONS`: golpe y guardia.
- `JUTSU_LIBRARY`: técnicas aprendibles.
- `EQUIPMENT`: armas, armaduras y accesorios.
- `ENEMY_ACTIONS`, `ENEMY_ROSTER` y `ENEMIES`: acciones, perfiles y lista de rivales.
- `STORY_SAGAS`: única lista de misiones principales conectadas a la campaña accesible.
- `SECONDARY_MISSIONS`: Kagemori y la búsqueda del médico errante.
- `MISSIONS`: catálogo exacto de las cinco misiones principales de la primera saga.

### `src/mission-system.js` — Reglas de misiones

- `requirementMet`, `unmetRequirements` y `missionState`: evalúan requisitos declarativos y progreso sin depender de una pantalla.
- `missionsForBoard` y `nextAvailableMission`: separan tableros y seleccionan contenido disponible.
- `missionHasStep` y `missionStep`: consultan mecánicas por significado en vez de por número de misión.
- `applyMissionEffects`: aplica consecuencias persistentes declaradas en los datos.
- `validateMissionCatalog`: rechaza IDs discontinuos, referencias rotas y tipos no registrados.

### `src/dialogues.js` — Catálogo traducible

- `DIALOGUE_CATALOGS`: líneas localizadas por clave estable.
- `DIALOGUE_PLACEMENTS`: superficie y propietario autorizados para cada conversación.
- `getDialogue`: resuelve idioma, variables, condiciones y ubicación.
- `validateDialogueReferences`: comprueba las referencias de todas las misiones.

### `src/view-runtime.js` — Ciclo de vistas

- `createViewRuntime`: mantiene una única revisión activa, aborta listeners y desmonta overlays al navegar.

### `src/save.js` — Guardado y progresión

- `SAVE_VERSION`: versión `16` del esquema persistido; migra la numeración principal y separa el progreso de secundarias.
- `createDefaultSave`: genera una partida vacía compatible con la versión actual.
- `initialLoadout` y `loadoutSlotsForLevel`: calculan técnicas y ranuras iniciales.
- `affinityXpForElement`, `isTechniqueLearned`: resuelven progreso y desbloqueos elementales.
- `createCharacter`: crea y normaliza el personaje inicial.
- `normalizeSave`, `loadSave`, `writeSave`: migran, leen y escriben la ranura activa.
- `listSaveSlots`, `selectSaveSlot`, `deleteSaveSlot`: administran las tres partidas locales y migran el guardado único anterior a la primera ranura.
- `xpForNextLevel`, `awardEncounter`, `completeMission`: calculan niveles y recompensas.
- `startDoctorMission`, `chooseDoctorMissionRoute`, `resolveDoctorRiverPassage`, `resolveDoctorMissionCombat`, `completeDoctorMission`: persisten las tres fases de búsqueda y sus consecuencias.
- `deliverBestiaryBook`, `recordBestiaryObservation`: activan la Biblioteca y completan fichas desde el combate.
- `spendAttribute`, `derivedStats`: aplican atributos y equipo a las estadísticas finales.

### `src/doctor-mission.js` — Rutas del médico errante

- `DOCTOR_ROUTE_DEFINITIONS`: resultados fijos del camino elevado, río y bosque para cada fase.
- `chooseDoctorRoute`, `resolveRiverPassage`, `resolveDoctorRouteCombat`: actualizan peligro, tiempo, pistas y recursos sin ramificar la historia final.
- `createDoctorRouteState`, `normalizeDoctorRouteState`: crean y validan el progreso reanudable de la búsqueda.

### `src/rules.js` — Reglas puras de combate

- `hasStatus`: consulta estados activos.
- `hitChance`: calcula precisión contra evasión.
- `affinityLabel`: traduce el modificador elemental a su etiqueta visible.
- `applyStatus`: añade o renueva un estado.
- `formatStatuses`: genera su presentación textual.

### `src/affinity-system.js` — Afinidades y modificadores

- `AFFINITY_CONFIG`: estadísticas y ventajas especiales de fuego, agua, tierra y viento.
- `normalizeAffinityOrder`, `availableAffinitySlots`: validan el orden y los espacios disponibles.
- `affinityStatModifiers`, `applyAffinityStatModifiers`: incorporan las afinidades a las estadísticas derivadas.
- `affinityCycleModifier`, `finalAffinityDamage`: resuelven el ciclo de ventaja elemental y el daño final.
- `addSoak`, `tickSoak`, `soakReduction`: gestionan la acumulación defensiva de agua.
- `furyDamageBonus`, `reprisalChance`, `reprisalDamage`, `hurricaneEyeEvasionBonus`: aplican las reglas especiales restantes.

### `src/elements.js` — Sistema elemental

- `BASIC_ELEMENT_IDS`, `ELEMENTS`, `ELEMENT_RANK_LABELS`: catálogo y rangos.
- `basicRequirements`: obtiene afinidades necesarias para una combinación.
- `canAccessElement`, `accessibleElements`: calculan elementos disponibles.
- `elementName`, `elementIcon`: devuelven nombre e icono presentables.

### `src/character.js` — Apariencia compartida

- `playerFighterAppearance`: traduce el guardado a una apariencia renderizable.
- `resolveFighterAppearance`: valida variantes, colores y equipamiento visual.
- `fighterPreviewSvg`: genera la vista previa SVG del combatiente.
- `clampVariant`, `colorHex`, `weaponSvg`, `hairSvg`: ayudas internas de validación y dibujo.

### `src/fighters.js` — Combatientes modulares

- `MAN_SPRITE_LAYERS`, `MAN_SPRITE_JOINTS`: definen piezas y articulaciones del combatiente raster provisional.
- `queuePlayerFighterTextures`: precarga las piezas compartidas del combatiente.
- `createPlayerFighter`, `destroyFighter`: construyen y liberan combatientes.
- `startPlayerBreathing`, `stopPlayerBreathing`: reposo animado.
- `startPlayerGuard`, `stopPlayerGuard`: postura defensiva.
- `startPlayerRunning`, `stopPlayerRunning`: transición de carrera.
- `preparePlayerPunch`, `releasePlayerPunch`, `recoverPlayerPunch`: secuencia articulada del golpe.
- `playFighterDamageReaction`: reacción compartida al recibir daño.

### `src/ui.js` — Interfaz del combate

- `createBar`: crea barras enmascaradas, con texto centrado y vaciado en ambos sentidos.
- `actionLines`, `actionDescription`: producen estadísticas y ayuda contextual.
- `createActionButton`: construye cada acción, atajo y tooltip.
- `drawActionChrome`, `createTooltip`: dibujan internamente el marco y la ayuda.

### `src/meta-ui.js` — Aldea y metajuego

- `mountMetaUI`: monta la creación del personaje, mapa, ubicaciones, diálogos, misiones, dojo y archivo.
- `warmImage`, `warmLocationAssets`: anticipan únicamente los fondos y retratos de la ubicación señalada o enfocada; no descargan secciones que el jugador todavía no abrió.
- `escapeHtml`: protege el texto que se inserta en plantillas HTML.
- `VILLAGE_LOCATIONS`: geometría, nombres y descripciones de los destinos del mapa.
- `renderDebugTools`: herramienta interna para checkpoints y accesos directos; debe retirarse antes de 1.0 junto con su botón y estilos.

### `src/npcs.js` — Habitantes y diálogos

- `NPCS`: perfiles, retratos y líneas del reparto.
- `LOCATION_CAST`: personajes presentes en cada ubicación.
- `locationDialogue`: devuelve una introducción o consejo contextual.
- `npcByName`: localiza un perfil por su nombre visible.

### `src/icons.js` — Iconos de interfaz

- `UI_ICONS`: catálogo de SVG de Lucide.
- `loadUiIcons`: registra los iconos en Phaser.
- `createUiIcon`: crea una instancia configurable en una escena.

## Sistema de animación: `src/animations`

| Archivo | Contenido y funciones |
| --- | --- |
| `rig.js` | `PUPPET_JOINTS`, `PUPPET_JOINT_PARENTS`, `PUPPET_PART_JOINTS` y `PUPPET_TARGETS`: jerarquía y objetivos del esqueleto. |
| `clips.js` | Estados, prioridades, catálogo `PUPPET_ANIMATION_CLIPS`, clip neutral y `animationClipList`. |
| `runtime.js` | Muestreo determinista de clips del juego: curvas, duración y `sampleKeyframeAnimationPose`. |
| `controller.js` | `PuppetAnimationController`: reproduce, prioriza, detiene y restaura los movimientos del juego. |
| `schema.js` | `validateAnimationCatalog` y `assertValidAnimationCatalog`: validación de catálogos con `tracks` o `keys`, sin mezclarlos. |

## Scripts de recursos

- `scripts/generate_modular_assets.ps1`: recorta atlas, limpia alfa y genera capas PNG reproducibles. Sus funciones principales son `New-Canvas`, `Get-Cell`, `Clean-Alpha`, `Get-ContentBounds`, `Save-Image-From-Cell`, `Save-Cell`, `Save-Blank` y `Clear-Below`.
- `scripts/optimize_web_assets.py`: convierte recursos para web y valida calidad con `composite_rgb`, `psnr`, `optimize` y `main`.

## Pruebas

| Archivo | Cobertura |
| --- | --- |
| `tests/affinity-system.test.mjs` | Afinidades del personaje, modificadores y reglas especiales de combate. |
| `tests/rules.test.mjs` | Precisión, afinidades y estados. |
| `tests/save.test.mjs` | Guardado, migración, progresión, equipo y recompensas. |
| `tests/character.test.mjs` | Apariencia y composición del personaje. |
| `tests/village-map.test.mjs` | Mapa y destinos de la aldea. |
| `tests/npcs.test.mjs` | Reparto y diálogos. |
| `tests/assets.test.mjs` | Dimensiones, transparencia y presencia de recursos. |
| `tests/elements.test.mjs` | Afinidades y combinaciones elementales. |
| `tests/battle-ui.test.mjs` | Contratos estáticos del HUD, escenas, acceso por resolución, documentación y herramientas internas. |
| `tests/content-systems.test.mjs` | IDs consecutivos, catálogos, requisitos cruzados, ubicación de diálogos y desmontaje de vistas. |
| `tests/desktop-layout.test.mjs` | Escenario lógico y adaptación de escritorio. |
| `tests/webp.mjs` | Lector mínimo de dimensiones y canal alfa para pruebas. |

El comando `npm test` ejecuta toda la batería en el orden definido por `package.json`.

## Recursos

- `assets/actions`: iconos de golpe y guardia.
- `assets/elements`: iconos elementales organizados por nivel.
- `assets/icons/lucide`: SVG de interfaz y su licencia.
- `assets/locations`: fondos de aldea y combate.
- `assets/modular`: capas, atlas, manifiesto y recursos del personaje modular.
- `assets/npcs`: retratos del reparto.
- `assets/ui`: marcos, paneles y temas del HUD.
- `assets/vendor`: Phaser servido localmente.
- `assets/village`: mapa principal.
- `modelos-interfaz`: referencias visuales de diseño.

## Criterio para futuros nombres

Los nombres físicos actuales permanecen en inglés porque forman parte de rutas públicas y contratos de importación. Si se decide traducirlos, conviene hacerlo en una rama exclusiva y actualizar simultáneamente imports, HTML, pruebas, documentación y rutas sensibles a mayúsculas de GitHub Pages.
