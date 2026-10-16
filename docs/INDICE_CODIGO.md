# Índice del código de Crónicas del Sello

Este documento asigna un nombre funcional en español a cada archivo importante y explica sus responsabilidades. Los nombres físicos se conservan para no romper imports ES Modules, URLs, caché, pruebas ni ramas de trabajo existentes.

## Flujo general

```text
index.html
  └─ game.js
      ├─ src/meta-ui.js ── aldea, personaje, dojo y misiones
      ├─ src/data.js ───── catálogo de contenido
      ├─ src/save.js ───── guardado y progresión
      ├─ src/rules.js ──── reglas puras de combate
      ├─ src/fighters.js ─ combatientes y animación
      ├─ src/ui.js ─────── barras, acciones y ayudas
      └─ src/animations/* ─ rig, clips, muestreo y Studio
```

## Archivos de entrada y presentación

| Archivo | Nombre funcional en español | Responsabilidad |
| --- | --- | --- |
| `index.html` | Entrada principal | Carga fuentes, estilos, Phaser, ajustes globales y el módulo del juego. |
| `game.js` | Orquestador del juego | Configura Phaser y contiene las escenas de viaje, combate y pausa. |
| `styles.css` | Estilos generales | Presentación de creación de personaje, aldea, ubicaciones, dojo, diálogos y misiones. |
| `desktop.css` | Diseño de escritorio | Adapta la interfaz al escenario lógico de escritorio y sus resoluciones. |
| `sw.js` | Caché sin conexión | Instala, actualiza y sirve los recursos estáticos versionados. |
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
- Combatientes y acciones: `createFighters`, `createActionPanel`, `startTurnCharge`, `resetTurnTimeline`, `useJutsu`, `playerAttack`, `playerGuard`, `companionAttack`, `executeEnemyAction` y `enemyTurn`.
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
- `EQUIPMENT`: armas, armaduras, accesorios y compañeros.
- `ENEMY_ACTIONS`, `ENEMY_ROSTER` y `ENEMIES`: acciones, perfiles y lista de rivales.
- `STORY_SAGAS` y `MISSIONS`: estructura completa de la campaña.

### `src/save.js` — Guardado y progresión

- `createDefaultSave`: genera una partida vacía compatible con la versión actual.
- `initialLoadout` y `loadoutSlotsForLevel`: calculan técnicas y ranuras iniciales.
- `affinityXpForElement`, `isTechniqueLearned`: resuelven progreso y desbloqueos elementales.
- `createCharacter`: crea y normaliza el personaje inicial.
- `normalizeSave`, `loadSave`, `writeSave`: migran, leen y escriben la ranura activa.
- `listSaveSlots`, `selectSaveSlot`, `deleteSaveSlot`: administran las tres partidas locales y migran el guardado único anterior a la primera ranura.
- `xpForNextLevel`, `awardEncounter`, `completeMission`: calculan niveles y recompensas.
- `spendAttribute`, `derivedStats`: aplican atributos y equipo a las estadísticas finales.

### `src/rules.js` — Reglas puras de combate

- `hasStatus`: consulta estados activos.
- `hitChance`: calcula precisión contra evasión.
- `affinityMultiplier` y `affinityLabel`: resuelven debilidades y resistencias.
- `applyStatus`: añade o renueva un estado.
- `formatStatuses`: genera su presentación textual.

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

- `fighterTextureKey`, `queueFighterTexture`, `queuePlayerFighterTextures`: identifican y precargan texturas.
- `createGeometricFighter`, `createPlayerFighter`, `destroyFighter`: construyen y liberan combatientes.
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
| `tests/rules.test.mjs` | Precisión, afinidades y estados. |
| `tests/save.test.mjs` | Guardado, migración, progresión, equipo y recompensas. |
| `tests/character.test.mjs` | Apariencia y composición del personaje. |
| `tests/village-map.test.mjs` | Mapa y destinos de la aldea. |
| `tests/npcs.test.mjs` | Reparto y diálogos. |
| `tests/assets.test.mjs` | Dimensiones, transparencia y presencia de recursos. |
| `tests/elements.test.mjs` | Afinidades y combinaciones elementales. |
| `tests/battle-ui.test.mjs` | HUD, acciones, escenas y comportamiento visual del combate. |
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

Los nombres físicos actuales permanecen en inglés porque forman parte de rutas públicas y contratos de importación. Si se decide traducirlos, conviene hacerlo en una rama exclusiva y actualizar simultáneamente imports, HTML, service worker, pruebas, documentación y rutas sensibles a mayúsculas de GitHub Pages.
