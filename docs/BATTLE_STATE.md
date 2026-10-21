# Estado de BattleScene

Fecha de actualización: 2026-10-21. El contrato separa los datos reanudables de las referencias y temporizadores propios de Phaser.

## Estado serializable

`BattleState` es propiedad de la escena y contiene dos grupos planos:

- Combatientes: `player`, `enemy`.
- Sesión: `saveData`, `missionStartSave`, `mission`, `combatFeatures`, `encounterIds`, `encounters`, `enemyIndex`, `actions`, `cooldowns`, `round`, `timelineProgress`, `pendingActions`, `defeatedEncounters`, `battleRewards`, `pendingEncounterRewards`, `rewardPreviewSave`, `fieldSupplies`, `nextRecovery`, `lastReward`, `missionReward`.

`timelineProgress` conserva por separado el avance normalizado de jugador y enemigo. `pendingActions` conserva la técnica elegida durante su recorrido de preparación entre 80 % y 100 %.

Los accesores instalados por `bindBattleState` conservan temporalmente la API `this.player` / `this.mission` mientras los módulos de presentación se extraen. No duplican valores: leen y escriben directamente el objeto de estado.

## Referencias de interfaz y presentación

No forman parte del estado serializable porque son objetos Phaser o nodos visuales:

- Combatientes renderizados: `hero`, `foe`.
- HUD: `arenaLabel`, `buttons`, `chakraBar`, `enemyChakraBar`, `enemyChakraLock`, `enemyHpBar`, `enemyName`, `enemyRankNumber`, `enemyRankStar`, `enemyTurnLetter`, `enemyTurnMarker`, `hudBarCenters`, `hudFrames`, `pauseButton`, `playerHpBar`, `playerName`, `playerRankNumber`, `playerRankStar`, `playerTurnLetter`, `playerTurnMarker`, `sealLayer`, `sealPrompt`, `timelineLayer`.
- Efectos: `bossPhaseSilhouette`, `epilogueBackground`, `guardAura`, `preparationFeedback`, `raizenDefenseAura`, `musicEvent`. `bossPhaseSilhouette` y `preparationFeedback` solo contienen referencias visuales y emisores activos; nunca alteran las reglas ni se serializan.

## Temporizadores, opciones y banderas de ejecución

Permanecen en la escena porque describen una ejecución activa, no una partida reanudable:

- Línea temporal: `busy`, `finished`, `turnReady`, `timelinePaused`, `timelineRunToken`, `timelineTween`.
- Entrada: `manualSeals`, `onActionShortcut`, `onSealModeChange`, `seenJutsus`.
- Presentación: `battleBackgroundKey`, `cameraEffects`, `flashEffects`, `hudTheme`, `lightMode`, `loadingHudTheme`, `musicEnabled`, `volume`, `audioContext`, `lastBattleMessage`.

Un combate interrumpido no serializa referencias ni timers. La Fase 6 reanudará al inicio del paso de combate, tal como exige el plan.

