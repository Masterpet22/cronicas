# Auditoría de `campaign`

Auditoría realizada en la Fase 1 sobre la versión de guardado 16. `createDefaultSave()` contiene 36 campos (el plan previo estimaba 43).

## Criterio

- **Derivado:** puede reconstruirse de una fuente canónica ya guardada, normalmente `completedMissions`, `completedSecondaryMissions` o una decisión.
- **Hecho:** representa progreso, una decisión, un objeto, un recurso mutable o un evento que no puede inferirse sin perder estado.
- **Aviso de interfaz:** evita repetir una introducción o notificación; no decide el progreso de la campaña.

| Campo | Clasificación | Evidencia de escritura y lectura |
| --- | --- | --- |
| `completedMissions` | Hecho | `completeMission` añade la misión; `mission-system.js`, Cuartel, Biblioteca y combate lo consultan como historial principal canónico. |
| `completedSecondaryMissions` | Hecho | Los completadores por tipo añaden la secundaria; `mission-system.js` lo usa como historial secundario canónico. |
| `rank` | Hecho | Se normaliza en `save.js` y se muestra en combate y cabecera. No existe un productor activo en la saga actual. |
| `elementRank` | Hecho | Se normaliza en `save.js` y controla afinidades y ramas del Dojo. No se deriva solo del nivel. |
| `tutorialSeen` | Aviso de interfaz | El creador y la plaza lo marcan después de los diálogos introductorios; solo evita repetirlos. |
| `sayoEncounterSeen` | Aviso de interfaz | `MissionEpilogueScene` lo marca al cerrar el epílogo de `m01`; evita repetir esa escena. |
| `secondaryBoardUnlocked` | Hecho | Se escribe al terminar el diálogo de Sayo en `MissionEpilogueScene`, no al conceder la recompensa de `m01`; la plaza y el Tablón lo consultan. Una partida puede estar entre ambos eventos, por lo que no se clasifica como derivado. |
| `kagemoriInvestigated` | Derivado | Se escribe al completar una misión `investigation` y `normalizeSave` ya lo reconstruye desde la secundaria completada. |
| `banditBossMissionUnlocked` | Derivado | Se activa con la misma investigación y `normalizeSave` lo reconstruye desde la secundaria completada. |
| `banditPrisonerChoice` | Hecho | El combate guarda `interrogate`/`eliminate`; combate, Tablón, Biblioteca y recompensas consumen la decisión. |
| `nextSideMissionGoldMultiplier` | Derivado | Vale 2 tras `interrogate` y vuelve a 1 al completar la búsqueda; puede calcularse con la decisión y el historial secundario. Se conserva hasta la migración v17. |
| `archiveUnlocked` | Hecho | `deliverBestiaryBook` lo activa después de una entrega explícita; completar la búsqueda no implica haber entregado el libro. |
| `sayoRelicPending` | Hecho | Solo existe en esquema y normalización; no tiene productor ni consumidor actual. Se conserva por compatibilidad v16. |
| `sayoRelicDelivered` | Hecho | Solo existe en esquema y normalización; no tiene productor ni consumidor actual. Se conserva por compatibilidad v16. |
| `seenMissionNotices` | Aviso de interfaz | La plaza añade objetivos vistos y lo usa únicamente para el indicador de novedades. |
| `cipherMapObtained` | Derivado | Es efecto de completar `m02`; `normalizeSave` ya lo reconstruye desde `completedMissions`. |
| `doctorMissionUnlocked` | Derivado | Es efecto de completar `m02`; la disponibilidad ahora se resuelve con el requisito `main-completed`. |
| `doctorMissionCompleted` | Derivado | El completador `route-search` y `normalizeSave` lo vinculan a la secundaria completada. |
| `doctorSupplyBonus` | Hecho | Se calcula con los recursos reunidos en la ruta y luego contribuye a `hideoutSupplies`; conserva el resultado concreto de la ruta. |
| `bestiaryBookObtained` | Derivado | Se entrega al completar la búsqueda `route-search`; habilita el registro del bestiario. |
| `doctorBookDeliveryPending` | Hecho | La búsqueda lo activa y `deliverBestiaryBook` lo consume; representa una cola de entrega pendiente. |
| `hideoutLocationRevealed` | Derivado | Se activa al completar la búsqueda y solo muestra la información del mapa en Biblioteca. |
| `hideoutMissionUnlocked` | Derivado | Se activa al entregar el libro; puede reconstruirse desde el hecho `archiveUnlocked`. Ya no participa como requisito de misión. |
| `secretEntranceKnown` | Derivado | `deliverBestiaryBook` lo calcula a partir de `banditPrisonerChoice`; se usa al elegir entrada y mostrar el mapa. |
| `hideoutEntryChoice` | Hecho | `chooseHideoutEntrance` guarda `main`/`secret`; cambia encuentros y bonificación de la misión. |
| `secretWarehouseLooted` | Hecho | El efecto contextual de completar `m03` registra si la bonificación secreta se concedió; se mantiene como resultado histórico estable. |
| `heartMissionUnlocked` | Derivado | Es efecto de completar `m03` y `normalizeSave` ya lo reconstruye desde el historial principal. |
| `hideoutSupplies` | Hecho | Se obtiene antes de `m04` y el combate lo consume; es un recurso mutable, no un simple desbloqueo. |
| `hideoutDiscoveryChoice` | Hecho | El final de `m04` guarda `prisoners`/`documents`; conserva la decisión narrativa. |
| `prisonersRescued` | Derivado | Se escribe como reflejo de `hideoutDiscoveryChoice === "prisoners"`. |
| `organizationDocumentsRecovered` | Derivado | Se escribe como reflejo de `hideoutDiscoveryChoice === "documents"`. |
| `organizationRevealed` | Derivado | La elección final y completar `m04` lo activan; `normalizeSave` ya lo reconstruye desde el historial. |
| `banditLeaderMissionUnlocked` | Derivado | Es efecto de completar `m04`; la disponibilidad ahora usa únicamente `main-completed`. |
| `firstSagaCompleted` | Derivado | Es efecto de completar `m05` y `normalizeSave` ya lo reconstruye desde el historial principal. |
| `doctorRoute` | Hecho | Guarda fase, elecciones, peligro, tiempo, pistas, recursos y evento pendiente; permite continuar la búsqueda. |
| `masterSelectionUnlocked` | Derivado | Es efecto de completar `m05` y `normalizeSave` ya lo reconstruye desde el historial principal. |

## Decisión de Fase 1

Se retiraron de los requisitos declarativos los flags derivados `doctorMissionUnlocked`, `banditBossMissionUnlocked`, `hideoutMissionUnlocked`, `heartMissionUnlocked` y `banditLeaderMissionUnlocked`. El único requisito `flag` restante es `secondaryBoardUnlocked`, porque representa el final efectivo del epílogo de Sayo y no solo la recompensa de `m01`.

Los campos derivados siguen escribiéndose y normalizándose para mantener compatibilidad con partidas v16. Su eliminación corresponde a la migración v17 de la Fase 6.
