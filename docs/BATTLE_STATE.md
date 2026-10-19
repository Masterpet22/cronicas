# Estado de BattleScene

Fecha del inventario: 2026-10-19. La escena contenía 169 nombres accedidos mediante `this.*`; 68 de ellos reciben asignaciones directas. El resto son métodos propios o servicios que Phaser inyecta (`add`, `anims`, `cameras`, `children`, `events`, `input`, `load`, `scene`, `textures`, `time`, `tweens`).

## Estado serializable

`BattleState` es propiedad de la escena y contiene dos grupos planos:

- Combatientes: `player`, `enemy`.
- Sesión: `saveData`, `missionStartSave`, `mission`, `combatFeatures`, `encounterIds`, `encounters`, `enemyIndex`, `actions`, `cooldowns`, `round`, `defeatedEncounters`, `battleRewards`, `pendingEncounterRewards`, `rewardPreviewSave`, `fieldSupplies`, `nextRecovery`, `lastReward`, `missionReward`.

Los accesores instalados por `bindBattleState` conservan temporalmente la API `this.player` / `this.mission` mientras los módulos de presentación se extraen. No duplican valores: leen y escriben directamente el objeto de estado.

## Referencias de interfaz y presentación

No forman parte del estado serializable porque son objetos Phaser o nodos visuales:

- Combatientes renderizados: `hero`, `foe`.
- HUD: `arenaLabel`, `buttons`, `chakraBar`, `enemyChakraBar`, `enemyChakraLock`, `enemyHpBar`, `enemyName`, `enemyRankNumber`, `enemyRankStar`, `enemyTurnLetter`, `enemyTurnMarker`, `hudBarCenters`, `hudFrames`, `pauseButton`, `playerHpBar`, `playerName`, `playerRankNumber`, `playerRankStar`, `playerTurnLetter`, `playerTurnMarker`, `sealLayer`, `sealPrompt`, `timelineLayer`.
- Efectos: `bossAura`, `epilogueBackground`, `guardAura`, `raizenDefenseAura`, `musicEvent`.

## Temporizadores, opciones y banderas de ejecución

Permanecen en la escena porque describen una ejecución activa, no una partida reanudable:

- Turno: `busy`, `finished`, `turnReady`.
- Entrada: `manualSeals`, `onActionShortcut`, `onSealModeChange`, `seenJutsus`.
- Presentación: `battleBackgroundKey`, `cameraEffects`, `flashEffects`, `hudTheme`, `lightMode`, `loadingHudTheme`, `musicEnabled`, `volume`, `audioContext`, `lastBattleMessage`.

Un combate interrumpido no serializa referencias ni timers. La Fase 6 reanudará al inicio del paso de combate, tal como exige el plan.

