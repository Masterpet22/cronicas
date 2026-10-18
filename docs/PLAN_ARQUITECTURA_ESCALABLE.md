# Plan integral de arquitectura escalable

## Estado del documento

- **Proyecto:** Crónicas del Sello.
- **Propósito:** definir la arquitectura final antes de volver a modificar el sistema de misiones, diálogos, guardado o navegación.
- **Estado:** propuesta pendiente de aprobación e implementación.
- **Alcance:** arquitectura, organización física, contratos, migración, límites de tamaño, pruebas y criterios de aceptación.
- **Regla principal:** durante la migración no pueden coexistir dos fuentes editables de verdad para una misma misión, diálogo o personaje.

Este documento no describe una implementación terminada. Es el contrato que deberá seguir la reestructuración. Si durante el trabajo aparece una necesidad que contradiga este plan, se deberá actualizar y aprobar primero este documento, en lugar de improvisar otra estructura paralela.

---

## 1. Problema que se quiere resolver

El proyecto ya tiene una campaña jugable, pero varias responsabilidades están concentradas en archivos que crecerán de forma difícil de mantener:

| Archivo actual | Tamaño aproximado | Responsabilidades mezcladas |
| --- | ---: | --- |
| `game.js` | 2562 líneas | Arranque, Phaser, viaje, combate, HUD, sellos, escenas narrativas, decisiones y resultados. |
| `src/meta-ui.js` | 1281 líneas | Navegación, vistas, tableros, ubicaciones, diálogos, Dojo, Archivo y herramientas de pruebas. |
| `src/save.js` | 651 líneas | Esquema, migraciones, almacenamiento, progresión, misiones, recompensas, personaje y debug. |
| `src/data.js` | 247 líneas | Sellos, acciones, técnicas, equipo, enemigos, sagas y misiones. |
| `src/dialogues.js` | 213 líneas | Briefings, escenas de misión y conversaciones de todos los personajes. |
| `src/mission-system.js` | 123 líneas | Requisitos, consultas, pasos, efectos y validación. |

La separación lógica introducida recientemente es útil, pero todavía crea concentradores globales. Si se agregan nuevas sagas, idiomas y mecánicas, esos archivos volverán a crecer y cualquier cambio exigirá conocer demasiadas partes del juego.

Los problemas concretos que debe resolver la nueva arquitectura son:

1. Evitar que las misiones se identifiquen por condicionales dispersos como `mission.id === "m04"`.
2. Separar físicamente el contenido de cada misión.
3. Separar de forma inequívoca principales y secundarias sin impedir requisitos cruzados.
4. Ejecutar las misiones mediante una máquina de estados real, no mediante una lista decorativa de etiquetas.
5. Permitir nuevas mecánicas sin modificar todos los sistemas existentes.
6. Preparar diálogos para traducción, variables, condiciones y control de ubicación.
7. Evitar vistas, listeners, overlays y canvases ejecutándose unos sobre otros.
8. Persistir y reanudar el paso real de una misión.
9. Controlar el tamaño y las dependencias de los archivos.
10. Evitar otra migración estructural cuando se agregue la siguiente saga.

---

## 2. Principios de diseño

### 2.1. Contenido y motor son cosas distintas

El contenido declara qué ocurre. El motor decide cómo evaluarlo y ejecutarlo.

- Una misión puede declarar un combate, pero no crea una escena Phaser.
- Un diálogo puede declarar su propietario y sus líneas, pero no crea HTML.
- Un requisito puede declarar otra misión completada, pero no consulta `localStorage`.
- Un efecto puede declarar una recompensa, pero no conoce botones ni vistas.

### 2.2. Una sola fuente de verdad

- Una misión se define en un solo `mission.js`.
- Un diálogo se define junto a su misión o personaje.
- El orden principal se define una sola vez en `saga.js`.
- El progreso persistente vive solamente en el guardado.
- El estado desbloqueado se calcula; no se duplica en banderas equivalentes.

### 2.3. Dependencias dirigidas

Las capas internas no deben conocer las externas:

```text
content ───────────────┐
                      ├─> app/bootstrap ─> aplicación
engine ────────────────┤
save ──────────────────┤
ui/game adapters ──────┘
```

Reglas:

- `content` no importa UI, guardado, DOM ni Phaser.
- `engine` no importa contenido concreto, DOM ni Phaser.
- `save` puede usar contratos del motor, pero nunca UI.
- `ui` y `game` consumen el motor mediante interfaces.
- `app/bootstrap.js` es el único lugar autorizado para conectar todas las capas.

### 2.4. Composición en lugar de condicionales por misión

Cada tipo de paso tiene un ejecutor registrado:

```js
handlers.register("dialogue", dialogueHandler);
handlers.register("combat", combatHandler);
handlers.register("choice", choiceHandler);
```

Una misión se diferencia por sus datos y configuración, no por ramas especiales dentro del motor.

### 2.5. Estado derivado siempre que sea posible

Si `s01` completada permite jugar `m02`, no se debe guardar también `m02Unlocked = true`. El evaluador puede calcularlo desde el requisito.

Solo se guardarán hechos que no puedan derivarse, por ejemplo:

- Una decisión narrativa.
- Una pista descubierta.
- Un objeto obtenido.
- El paso actual de una misión activa.
- Un efecto ya aplicado.

### 2.6. Cancelación y desmontaje explícitos

Cada vista, overlay, misión o instancia Phaser debe tener un propietario y una forma de cancelarse. Ningún callback asíncrono puede seguir modificando una pantalla después de que su ámbito haya sido desmontado.

---

## 3. Estructura final de directorios

```text
src/
├─ engine/
│  ├─ missions/
│  │  ├─ mission-runner.js
│  │  ├─ mission-registry.js
│  │  ├─ condition-evaluator.js
│  │  ├─ effect-runner.js
│  │  └─ mission-validator.js
│  │
│  ├─ dialogue/
│  │  ├─ dialogue-runner.js
│  │  └─ dialogue-validator.js
│  │
│  ├─ views/
│  │  └─ view-runtime.js
│  │
│  └─ content-registry.js
│
├─ content/
│  ├─ characters/
│  │  ├─ ren.js
│  │  ├─ sayo.js
│  │  ├─ daichi.js
│  │  ├─ mei.js
│  │  ├─ kureha.js
│  │  ├─ goro.js
│  │  ├─ hana.js
│  │  ├─ yuna.js
│  │  ├─ riku.js
│  │  ├─ nao.js
│  │  ├─ iori.js
│  │  ├─ nami.js
│  │  └─ index.js
│  │
│  ├─ combat/
│  │  ├─ actions.js
│  │  ├─ enemies.js
│  │  ├─ equipment.js
│  │  ├─ jutsus.js
│  │  ├─ seals.js
│  │  └─ index.js
│  │
│  ├─ sagas/
│  │  ├─ futuro-prometedor/
│  │  │  ├─ saga.js
│  │  │  ├─ index.js
│  │  │  │
│  │  │  ├─ m01-gato/
│  │  │  │  ├─ mission.js
│  │  │  │  └─ dialogues.js
│  │  │  │
│  │  │  ├─ s01-kagemori/
│  │  │  │  ├─ mission.js
│  │  │  │  ├─ dialogues.js
│  │  │  │  └─ investigation.js
│  │  │  │
│  │  │  ├─ m02-desfiladero/
│  │  │  │  ├─ mission.js
│  │  │  │  └─ dialogues.js
│  │  │  │
│  │  │  ├─ s02-medico/
│  │  │  │  ├─ mission.js
│  │  │  │  ├─ dialogues.js
│  │  │  │  └─ routes.js
│  │  │  │
│  │  │  ├─ m03-umbral/
│  │  │  │  ├─ mission.js
│  │  │  │  └─ dialogues.js
│  │  │  │
│  │  │  ├─ m04-corazon/
│  │  │  │  ├─ mission.js
│  │  │  │  └─ dialogues.js
│  │  │  │
│  │  │  └─ m05-raizen/
│  │  │     ├─ mission.js
│  │  │     └─ dialogues.js
│  │  │
│  │  └─ index.js
│  │
│  └─ index.js
│
├─ app/
│  ├─ bootstrap.js
│  ├─ surface-manager.js
│  └─ mission-handlers/
│     ├─ dialogue-handler.js
│     ├─ combat-handler.js
│     ├─ investigation-handler.js
│     ├─ route-handler.js
│     ├─ choice-handler.js
│     ├─ resource-handler.js
│     └─ consequence-handler.js
│
├─ game/
│  ├─ game-runtime.js
│  ├─ scenes/
│  │  ├─ travel-scene.js
│  │  ├─ battle-scene.js
│  │  ├─ results-scene.js
│  │  ├─ secondary-results-scene.js
│  │  ├─ epilogue-scene.js
│  │  └─ pause-scene.js
│  │
│  └─ battle/
│     ├─ combat-controller.js
│     ├─ hud-controller.js
│     ├─ action-controller.js
│     ├─ seal-controller.js
│     └─ battle-presentation.js
│
├─ ui/
│  └─ meta/
│     ├─ meta-router.js
│     ├─ shell.js
│     ├─ overlays/
│     │  ├─ dialogue-overlay.js
│     │  └─ decision-overlay.js
│     └─ views/
│        ├─ save-slots.js
│        ├─ character-creator.js
│        ├─ village.js
│        ├─ mission-board.js
│        ├─ kagemori.js
│        ├─ doctor-route.js
│        ├─ dojo.js
│        ├─ archive.js
│        └─ debug-tools.js
│
├─ save/
│  ├─ save-schema.js
│  ├─ save-migrations.js
│  ├─ save-repository.js
│  ├─ campaign-state.js
│  └─ character-state.js
│
└─ save.js
```

### 3.1. Función de los archivos índice

Los archivos `index.js` solo registran o exportan contenido. No pueden contener lógica de juego.

Ejemplo:

```js
import { mission as m01 } from "./m01-gato/mission.js";
import { mission as s01 } from "./s01-kagemori/mission.js";

export const futurePromiseContent = {
  saga,
  missions: [m01, s01, m02, s02, m03, m04, m05],
  dialogueBundles: [...]
};
```

Los módulos internos nunca deben importar desde su propio archivo índice, para evitar dependencias circulares.

---

## 4. Contrato de saga

Cada saga separará explícitamente la historia principal de sus encargos secundarios:

```js
export const saga = {
  id: "futuro-prometedor",
  number: 1,
  title: "Futuro prometedor",
  subtitle: "Tu primera misión como combatiente de la aldea",

  mainMissions: [
    "m01",
    "m02",
    "m03",
    "m04",
    "m05"
  ],

  secondaryMissions: [
    "s01",
    "s02"
  ]
};
```

Reglas:

- `mainMissions` determina el orden visible en el Cuartel.
- `secondaryMissions` agrupa contenido perteneciente a la saga, pero no lo inserta en la lista principal.
- Una secundaria puede ser requisito de una principal.
- La posición física de las carpetas no determina el orden.
- Una misión solo puede pertenecer a una saga.
- Un ID principal usa `mNN`; un ID secundario usa `sNN`.
- Los números deben ser consecutivos dentro de cada categoría global mientras el proyecto mantenga ese convenio.

Flujo canónico actual:

```text
m01 → s01 → m02 → s02 → m03 → m04 → m05
```

Este flujo de desbloqueo no cambia la ubicación de cada misión:

```text
Cuartel: m01, m02, m03, m04, m05
Tablón: s01, s02
```

---

## 5. Contrato de misión

Cada `mission.js` exportará un objeto declarativo y serializable.

```js
export const mission = {
  schemaVersion: 1,
  id: "m02",
  sagaId: "futuro-prometedor",
  order: 2,
  category: "main",
  board: "headquarters",

  title: "Asalto al Desfiladero del Cuervo",
  location: "Ruta de la cantera",
  duration: "12–15 min",
  rank: "D",

  requirements: [
    {
      type: "mission-completed",
      missionId: "s01"
    }
  ],

  steps: [
    {
      id: "briefing",
      type: "dialogue",
      dialogueId: "briefing"
    },
    {
      id: "canyon-combat",
      type: "combat",
      encounters: [
        "bandit_pathfinder",
        "bandit_lieutenant",
        "boss_akumori"
      ]
    },
    {
      id: "canyon-traces",
      type: "investigation",
      afterEncounter: 0
    },
    {
      id: "lieutenant-fate",
      type: "choice",
      afterEncounter: 1,
      dialogueId: "lieutenant-choice",
      choices: [
        {
          id: "interrogate",
          dialogueId: "lieutenant-interrogate"
        },
        {
          id: "eliminate",
          dialogueId: "lieutenant-eliminate"
        }
      ]
    }
  ],

  onComplete: [
    {
      id: "grant-cipher-map",
      type: "item-add",
      itemId: "cipher-map",
      quantity: 1
    }
  ]
};
```

### 5.1. Propiedades obligatorias

- `schemaVersion`.
- `id`.
- `sagaId`.
- `order`.
- `category`.
- `board`.
- `title`.
- `requirements`.
- `steps`.
- `onComplete`.

### 5.2. Reglas del contenido

- Cada paso tiene un `id` estable dentro de la misión.
- Cada paso tiene un `type` registrado.
- Los encuentros pertenecen al paso de combate, no a la raíz de la misión.
- Las decisiones pertenecen al paso que las produce.
- El texto narrativo no se incrusta en `mission.js`; se referencia mediante `dialogueId`.
- Las recompensas y consecuencias se declaran como efectos.
- Una misión no importa handlers, Phaser, DOM, guardado ni otras misiones.

---

## 6. Registro de contenido

`content-registry.js` almacena definiciones registradas. No contiene contenido concreto.

Interfaz prevista:

```js
const registry = createContentRegistry();

registry.registerCharacter(character);
registry.registerSaga(saga);
registry.registerMission(mission);
registry.registerDialogueBundle(bundle);
registry.registerEnemy(enemy);

registry.getCharacter(id);
registry.getSaga(id);
registry.getMission(id);
registry.getDialogueBundle(ownerId);
registry.getEnemy(id);
```

Validaciones inmediatas:

- IDs duplicados.
- Registro vacío o incompleto.
- Categorías desconocidas.
- Saga inexistente.
- Personaje o enemigo inexistente.
- Diálogo sin propietario.

`content/index.js` reúne el contenido. `app/bootstrap.js` se lo entrega al registro. El motor no importa `content/index.js` directamente.

---

## 7. Registro y consulta de misiones

`mission-registry.js` será una fachada especializada sobre el registro de contenido.

Interfaz prevista:

```js
missionRegistry.getById(id);
missionRegistry.getMainMissions(sagaId);
missionRegistry.getSecondaryMissions(sagaId);
missionRegistry.getForBoard(boardId);
missionRegistry.getState(missionId, gameState);
missionRegistry.getNextAvailable(sagaId, gameState);
```

Estados calculados:

```text
locked
available
active
completed
```

`available` y `locked` se calculan desde requisitos. No se guardan.

---

## 8. Evaluación de condiciones

`condition-evaluator.js` debe ser una función pura. Recibe una condición y un estado de juego; no lee almacenamiento ni actualiza datos.

Condiciones iniciales:

```js
{ type: "mission-completed", missionId: "s01" }

{ type: "flag", path: "story.secretEntranceKnown", equals: true }

{ type: "level", minimum: 4 }

{ type: "item-owned", itemId: "cipher-map", quantity: 1 }

{
  type: "all",
  conditions: [...]
}

{
  type: "any",
  conditions: [...]
}

{
  type: "not",
  condition: {...}
}
```

Interfaz:

```js
evaluateCondition(condition, gameState, registries);
evaluateConditions(conditions, gameState, registries);
explainUnmetConditions(conditions, gameState, registries);
```

La explicación de requisitos no cumplidos devolverá códigos y variables, no textos finales. La UI los traducirá.

### 8.1. Eliminación de desbloqueos redundantes

Se eliminarán banderas cuyo único significado sea repetir otra condición:

```text
banditBossMissionUnlocked
doctorMissionUnlocked
hideoutMissionUnlocked
heartMissionUnlocked
banditLeaderMissionUnlocked
```

Se conservarán únicamente si representan un hecho narrativo diferente e imposible de deducir. En caso contrario, el acceso se calcula desde misiones, objetos o decisiones ya persistidas.

---

## 9. Ejecución de efectos

`effect-runner.js` aplica cambios explícitos y verificables al estado.

Tipos iniciales:

```text
flag-set
counter-add
item-add
item-remove
currency-add
experience-add
context-copy
bestary-observation
```

Cada efecto tendrá un `id` estable:

```js
{
  id: "m02-grant-cipher-map",
  type: "item-add",
  itemId: "cipher-map",
  quantity: 1
}
```

El runner registrará `appliedEffects` para impedir recompensas duplicadas al recargar o reanudar.

Interfaz:

```js
applyEffect(effect, gameState, context);
applyEffects(effects, gameState, context);
```

Reglas:

- No modificar el objeto de entrada directamente.
- Rechazar tipos desconocidos.
- No aplicar dos veces el mismo efecto a una sesión.
- Separar efectos de primera finalización y efectos repetibles.
- Mantener las recompensas de combate diferenciadas de la recompensa final de misión.

---

## 10. Ejecutor de misiones

`mission-runner.js` será el centro de la ejecución, no del contenido.

### 10.1. Estado de una sesión

```js
{
  missionId: "m02",
  status: "active",
  currentStepId: "canyon-combat",
  completedSteps: ["briefing"],
  context: {
    lieutenantChoice: null
  },
  appliedEffects: [],
  attempts: 1
}
```

### 10.2. Responsabilidades

- Validar que la misión exista.
- Verificar requisitos antes de iniciar.
- Crear o reanudar una sesión.
- Resolver el paso actual.
- Obtener el handler por `step.type`.
- Entregar al handler un contexto controlado.
- Esperar un resultado normalizado.
- Persistir decisiones y datos del paso.
- Aplicar efectos del paso.
- Marcar el paso como completado.
- Avanzar al siguiente paso.
- Aplicar efectos finales una sola vez.
- Completar, fallar, cancelar o abandonar.
- Respetar `AbortSignal` al cambiar de superficie.

### 10.3. Resultado normalizado de un handler

```js
{
  status: "completed",
  contextPatch: {
    lieutenantChoice: "interrogate"
  },
  effects: [],
  nextStepId: null
}
```

Estados de resultado permitidos:

```text
completed
failed
cancelled
paused
```

### 10.4. Interfaz prevista

```js
runner.canStart(missionId, gameState);
runner.start(missionId, gameState, runtimeContext);
runner.resume(missionId, gameState, runtimeContext);
runner.cancel(reason);
runner.getActiveSession();
```

El runner solo permite una sesión activa por partida.

---

## 11. Handlers de mecánicas

Los handlers conectan el motor con la presentación.

| Handler | Responsabilidad |
| --- | --- |
| `dialogue-handler.js` | Resolver un diálogo y solicitar su presentación. |
| `combat-handler.js` | Lanzar una secuencia de encuentros y devolver el resultado. |
| `investigation-handler.js` | Presentar zonas o pistas y devolver descubrimientos. |
| `route-handler.js` | Ejecutar rutas y fases convergentes. |
| `choice-handler.js` | Presentar opciones y devolver la elegida. |
| `resource-handler.js` | Administrar decisiones de consumo o conservación. |
| `consequence-handler.js` | Aplicar una consecuencia visual o mecánica derivada del estado. |

Contrato de un handler:

```js
export const handler = {
  type: "choice",

  async execute({ mission, step, session, gameState, signal, services }) {
    // Devuelve un resultado normalizado.
  }
};
```

Reglas:

- No compara IDs de misión.
- Puede usar `step.id` solamente para datos locales y telemetría, no para seleccionar lógica oculta.
- Debe detenerse si `signal.aborted` es verdadero.
- No escribe directamente en `localStorage`.
- No completa una misión por su cuenta.
- No mantiene listeners después de finalizar.

### 11.1. Añadir una mecánica futura

Para añadir sigilo:

1. Crear `stealth-handler.js`.
2. Registrar el tipo `stealth`.
3. Enseñar al validador su esquema.
4. Declarar el paso en la misión.
5. Añadir pruebas del handler.

No se modifican tableros, guardado, otras misiones ni el runner.

---

## 12. Arquitectura de diálogos

### 12.1. Ubicación del contenido

- Diálogos propios de una misión: junto a su `mission.js`.
- Conversaciones generales de un personaje: junto a su personaje.
- Textos de interfaz: catálogo de UI independiente, no mezclado con narración.

Ejemplo de `dialogues.js`:

```js
export const dialogues = {
  owner: {
    type: "mission",
    id: "m02"
  },

  locales: {
    es: {
      briefing: {
        owner: {
          type: "mission-step",
          missionId: "m02",
          stepId: "briefing"
        },
        surface: "mission-briefing",
        lines: [
          {
            speakerId: "ren",
            text: "Nami confirmó la ruta hacia el Desfiladero del Cuervo."
          },
          {
            speakerId: "master",
            text: "{masterName} irá contigo."
          }
        ]
      }
    }
  }
};
```

### 12.2. Dialogue runner

`dialogue-runner.js`:

- Resuelve propietario y clave.
- Selecciona idioma.
- Usa español como respaldo.
- Evalúa condiciones por línea.
- Interpola variables.
- Verifica superficie y paso.
- Devuelve una estructura presentable.
- No crea DOM ni objetos Phaser.

Interfaz:

```js
dialogueRunner.resolve({
  ownerType: "mission",
  ownerId: "m02",
  dialogueId: "briefing",
  locale: "es",
  placement: {
    surface: "mission-briefing",
    stepId: "briefing"
  },
  variables: {
    masterName: "Mei Hayate"
  },
  gameState
});
```

### 12.3. Dialogue validator

`dialogue-validator.js` comprobará:

- Clave duplicada.
- Propietario existente.
- Speaker existente.
- Misión y paso existentes.
- Superficie autorizada.
- Variables faltantes.
- Variables distintas entre idiomas.
- Traducción ausente cuando el idioma esté marcado como completo.
- Condiciones inválidas.
- Texto narrativo vacío.

### 12.4. Identificadores globales

Las claves locales se resolverán mediante namespace:

```text
mission:futuro-prometedor:m02:briefing
mission:futuro-prometedor:m02:lieutenant-choice
character:ren:headquarters-intro
```

Los autores de contenido seguirán usando claves cortas dentro de su carpeta; el registro construirá el identificador global.

---

## 13. Personajes

Cada personaje se define en un archivo pequeño:

```js
export const ren = {
  id: "ren",
  name: "Ren Arashiro",
  title: "Jefe de la Aldea",
  portrait: "assets/npcs/ren-arashiro.webp",
  locations: ["headquarters"],

  dialogues: {
    locales: {
      es: {
        intro: {...},
        guide: {...}
      }
    }
  }
};
```

`characters/index.js` reúne perfiles, pero no duplica nombres, retratos ni diálogos.

---

## 14. Contenido específico de las misiones actuales

### 14.1. `m01-gato`

- Briefing.
- Tutorial de combate.
- Tres encuentros.
- Epílogo con Sayo.
- Recompensa de primera finalización.

### 14.2. `s01-kagemori`

- Briefing.
- Viaje a Kagemori.
- Configuración de zonas investigables en `investigation.js`.
- Pistas verdaderas y descartes.
- Resultado que permite calcular la disponibilidad de `m02`.

### 14.3. `m02-desfiladero`

- Briefing.
- Combate por encuentros.
- Investigación intermedia.
- Decisión del teniente.
- Reacción de Akumori a la decisión.
- Obtención del mapa cifrado.

### 14.4. `s02-medico`

- Briefing.
- Tres fases de rutas.
- Datos de rutas en `routes.js`.
- Posible combate de ruta.
- Resolución convergente.
- Reanudación desde fase persistida.

La lógica genérica de rutas debe vivir en el handler. `routes.js` solo describe eventos y resultados de esta misión.

### 14.5. `m03-umbral`

- Elección de entrada.
- Ruta principal o secreta.
- Almacén y bonificación.
- Selección de encuentros según la ruta.

### 14.6. `m04-corazon`

- Administración de suministros.
- Recuperación entre encuentros.
- Decisión sobre prisioneros o documentos.
- Revelación de la organización.

### 14.7. `m05-raizen`

- Consecuencia de la decisión del teniente.
- Duelo con Raizen.
- Patrones y segunda fase.
- Finalización de saga.

Cada uno de estos comportamientos debe expresarse mediante pasos, configuración y handlers. No mediante condicionales de ID dentro de `game.js`.

---

## 15. Guardado y reanudación

### 15.1. Nueva versión

La migración estructural incrementará el guardado a `SAVE_VERSION = 17`.

### 15.2. Estado propuesto

```js
campaign: {
  missionProgress: {
    m01: {
      status: "completed",
      currentStepId: null,
      completedSteps: [
        "briefing",
        "forest-combat",
        "epilogue"
      ],
      context: {},
      appliedEffects: [
        "m01-first-clear-reward"
      ],
      attempts: 1
    },

    m02: {
      status: "active",
      currentStepId: "lieutenant-fate",
      completedSteps: [
        "briefing",
        "canyon-combat-1",
        "canyon-traces"
      ],
      context: {},
      appliedEffects: [],
      attempts: 1
    }
  },

  story: {
    secretEntranceKnown: true,
    organizationRevealed: false
  },

  inventory: {
    "cipher-map": 1
  }
}
```

### 15.3. Datos derivados que no se guardan

- Misión desbloqueada.
- Siguiente misión disponible.
- Cantidad de misiones visibles en un tablero.
- Saga desbloqueada cuando se derive de la anterior.
- Requisitos cumplidos.

### 15.4. Migración v16 → v17

La migración deberá convertir:

- `completedMissions`.
- `completedSecondaryMissions`.
- Misión y fase activa del médico.
- Decisión del teniente.
- Entrada elegida.
- Hallazgo de prisioneros o documentos.
- Pistas y objetos narrativos.
- Bonificaciones y recompensas ya concedidas.

Las referencias históricas `m11`–`m14` permanecerán exclusivamente en `save-migrations.js` y en pruebas de migración.

### 15.5. División de responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `save-schema.js` | Crear y normalizar el esquema vigente. |
| `save-migrations.js` | Transformaciones entre versiones. |
| `save-repository.js` | Leer y escribir ranuras en `localStorage`. |
| `campaign-state.js` | Operaciones puras sobre campaña y misiones. |
| `character-state.js` | Progresión, afinidades, atributos y maestro. |
| `save.js` | Fachada temporal de compatibilidad. |

---

## 16. Ciclo de vida de vistas

### 16.1. Surface manager

`surface-manager.js` controla dos superficies mayores:

```text
meta
game
```

Contrato previsto:

```js
surfaceManager.showMeta(viewFactory);
surfaceManager.showGame(gameFactory);
surfaceManager.replaceOverlay(overlayFactory);
surfaceManager.clearOverlay();
surfaceManager.dispose();
```

### 16.2. Cambio de superficie

Cada transición debe:

1. Incrementar la revisión de navegación.
2. Abortar el `AbortController` anterior.
3. Ejecutar limpiezas registradas.
4. Eliminar overlays transitorios.
5. Destruir la instancia Phaser si se abandona `game`.
6. Vaciar el contenedor anterior.
7. Montar una única superficie.
8. Ignorar resultados asíncronos de revisiones antiguas.

### 16.3. Invariantes

En cualquier momento debe existir como máximo:

```text
1 vista meta activa
1 canvas Phaser
1 overlay modal
1 sesión de misión activa
1 ámbito de listeners por vista
```

Al cambiar de vista deben quedar:

```text
0 listeners de la vista anterior
0 overlays huérfanos
0 canvases ocultos ejecutándose
0 callbacks capaces de sobrescribir la vista nueva
```

### 16.4. Integración con el runner

El `mission-runner` recibe el mismo `AbortSignal` de la superficie activa. Si se vuelve a la aldea, se cambia de partida o se destruye Phaser, el paso actual debe cancelar su trabajo antes de que se monte otra pantalla.

---

## 17. División de `meta-ui.js`

`meta-ui.js` se sustituirá por módulos de vistas pequeñas.

### 17.1. Router

`meta-router.js`:

- Selecciona la vista.
- Entrega dependencias.
- No genera grandes plantillas.
- No contiene contenido de misiones.

### 17.2. Vistas

Cada vista expone un contrato similar:

```js
export function createMissionBoardView(dependencies) {
  return {
    id: "mission-board",
    render(state) {},
    mount(root, scope) {},
    dispose() {}
  };
}
```

La vista del tablero recibe consultas del registro; no importa directamente todas las misiones.

### 17.3. Overlays

- `dialogue-overlay.js` presenta líneas ya resueltas.
- `decision-overlay.js` presenta opciones ya validadas.
- No consultan el guardado.
- Devuelven una promesa cancelable.

### 17.4. Herramientas de pruebas

`debug-tools.js` permanece aislado durante desarrollo. Antes de 1.0 se elimina la vista y su registro en el router sin tocar las demás pantallas.

---

## 18. División de `game.js`

`game.js` debe convertirse en un entry point pequeño que invoque `app/bootstrap.js`.

### 18.1. Escenas

Cada escena Phaser vive en su propio archivo:

- Viaje.
- Batalla.
- Resultado principal.
- Resultado secundario.
- Epílogo.
- Pausa.

### 18.2. Controladores de batalla

La batalla se divide por responsabilidad:

| Módulo | Responsabilidad |
| --- | --- |
| `combat-controller.js` | Turnos, daño, estados y victoria. |
| `hud-controller.js` | Barras, mensajes, cronología y refresco visual. |
| `action-controller.js` | Acciones del jugador y enemigo. |
| `seal-controller.js` | Secuencias manuales y automáticas. |
| `battle-presentation.js` | Transiciones, impactos, flashes, cámara y audio. |

`battle-scene.js` coordina estos módulos, pero no reimplementa sus reglas.

### 18.3. Integración de pasos de misión

La escena de batalla recibe un paso de combate ya resuelto:

```js
{
  missionId: "m02",
  stepId: "canyon-combat",
  encounters: [...],
  modifiers: [...]
}
```

Devuelve:

```js
{
  status: "completed",
  defeatedEncounters: [...],
  rewards: {...},
  observations: [...]
}
```

No completa la misión directamente.

---

## 19. Límites de tamaño y complejidad

### 19.1. Objetivos

| Tipo de archivo | Objetivo | Límite duro |
| --- | ---: | ---: |
| Entry point o archivo índice | 50–100 líneas | 150 líneas |
| Módulo normal | ≤250 líneas | 400 líneas |
| Escena o controlador Phaser | ≤350 líneas | 500 líneas |
| Definición de misión | 40–150 líneas | 250 líneas |
| Diálogos de una misión | ≤200 líneas | 250 líneas |
| Migración individual | ≤150 líneas | 250 líneas |

Los límites no sustituyen el diseño, pero detectan concentradores antes de que se vuelvan monolitos.

### 19.2. Prueba de arquitectura

`tests/architecture.test.mjs` comprobará:

- Líneas por archivo.
- Importaciones entre capas.
- Ausencia de misiones en `src/data.js`.
- Ausencia de texto narrativo en handlers y escenas.
- Ausencia de comparaciones de IDs de misión fuera de contenido, migraciones y pruebas.
- Ausencia de imports de Phaser o DOM desde `engine` y `content`.
- Ausencia de imports de UI desde `save`.

Una excepción debe figurar explícitamente en la prueba con justificación y fecha de revisión. No se permitirá una lista genérica de exclusiones.

---

## 20. Validación del catálogo

`mission-validator.js` validará todo el contenido durante pruebas y al iniciar una compilación de desarrollo.

Comprobaciones:

- IDs únicos y formato correcto.
- Numeración consecutiva.
- Saga existente.
- Categoría y tablero compatibles.
- Orden principal sin duplicados.
- Secundarias no incluidas en `mainMissions`.
- Requisitos válidos.
- Referencias a misiones existentes.
- Ciclos imposibles de requisitos.
- Pasos con IDs únicos.
- Tipo de paso registrado.
- Configuración mínima por tipo.
- `dialogueId` existente.
- Efectos con IDs únicos.
- Tipo de efecto registrado.
- Enemigos, objetos y personajes existentes.
- Paso inicial y rutas de avance alcanzables.

La validación debe devolver todos los errores encontrados, no detenerse en el primero.

---

## 21. Estrategia de pruebas

### 21.1. Pruebas unitarias

- Evaluación de cada condición.
- Composición `all`, `any` y `not`.
- Aplicación e idempotencia de efectos.
- Registro y consultas de misiones.
- Validación de catálogos inválidos.
- Resolución de idiomas y variables.
- Control de placement de diálogos.
- Avance, pausa, fallo y reanudación del runner.

### 21.2. Pruebas de integración

- Flujo `m01 → s01 → m02`.
- Flujo `m02 → s02 → m03`.
- Decisión del teniente y consecuencia en `m05`.
- Entrada secreta de `m03`.
- Recursos de `m04`.
- Ruta reanudable de `s02`.
- Recompensas aplicadas una sola vez.

### 21.3. Guardado

- Crear una partida v17.
- Normalizar datos parciales.
- Migrar v16.
- Migrar guardados con IDs antiguos.
- Reanudar una misión activa.
- Repetir una misión sin duplicar primera recompensa.
- Cambiar de ranura sin mezclar sesiones.

### 21.4. Ciclo de vistas

- Cambiar de vista aborta listeners.
- Un overlay anterior no responde después del cambio.
- Salir de Phaser destruye el canvas.
- Una respuesta tardía no reemplaza una vista nueva.
- Solo existe una sesión de misión activa.

### 21.5. Pruebas reales de navegador

Recorrido mínimo obligatorio:

1. Crear o cargar partida.
2. Abrir Cuartel.
3. Iniciar `m01`.
4. Completar o simular finalización.
5. Abrir Tablón.
6. Ejecutar `s01`.
7. Volver a la aldea.
8. Confirmar que `m02` se habilita.
9. Repetir la transición HTML → Phaser → HTML.
10. Verificar canvas, overlays, listeners y errores de consola.

---

## 22. Plan de migración

No se desarrollarán nuevas misiones durante esta migración. El objetivo es mover el contenido actual sin alterar sus resultados jugables.

### Fase 0 — Congelar contratos actuales

Acciones:

- Registrar el comportamiento esperado de las siete misiones.
- Añadir pruebas de regresión de requisitos, decisiones y recompensas.
- Documentar el guardado v16 de entrada.
- Añadir prueba de ciclo de vistas y canvas.

Criterio de salida:

- La campaña actual está protegida por pruebas antes de mover archivos.

### Fase 1 — Fundaciones del motor

Crear:

- `content-registry.js`.
- `mission-registry.js`.
- `condition-evaluator.js`.
- `effect-runner.js`.
- Validadores.

Todavía no se cambia la ejecución visual.

Criterio de salida:

- Los nuevos módulos tienen pruebas puras.
- No dependen de contenido concreto, DOM o Phaser.

### Fase 2 — Migración atómica del contenido

Acciones:

- Crear la carpeta de la saga.
- Mover las siete misiones.
- Mover sus diálogos.
- Mover personajes.
- Mover datos específicos de Kagemori y del médico.
- Eliminar las definiciones equivalentes de archivos globales en la misma fase.

Criterio de salida:

- Cada pieza de contenido tiene exactamente una definición.
- `content/index.js` registra toda la campaña vigente.
- El catálogo completo pasa validación.

### Fase 3 — Runner y handlers

Acciones:

- Implementar sesiones de misión.
- Registrar handlers.
- Convertir cada comportamiento específico en configuración.
- Eliminar condicionales por ID de UI y Phaser.

Orden recomendado de conversión:

```text
m01 → s01 → m02 → s02 → m03 → m04 → m05
```

Criterio de salida:

- Las siete misiones se inician, avanzan y completan mediante el runner.
- No existe lógica de selección por ID fuera del contenido.

### Fase 4 — División de UI y Phaser

Acciones:

- Introducir `surface-manager`.
- Dividir las vistas de `meta-ui.js`.
- Dividir escenas y controladores de `game.js`.
- Conectar cancelación de superficies, handlers y runner.

Criterio de salida:

- `game.js` y `meta-ui.js` dejan de ser monolitos.
- Las invariantes de una sola vista y un solo canvas se cumplen.

### Fase 5 — Guardado v17

Acciones:

- Crear módulos de guardado.
- Migrar a `missionProgress`.
- Eliminar desbloqueos redundantes.
- Incorporar reanudación por paso.
- Mantener `src/save.js` como fachada temporal.

Criterio de salida:

- Guardados nuevos y antiguos funcionan.
- Reanudar no repite efectos.

### Fase 6 — Retirada de compatibilidad

Eliminar cuando ya no tengan consumidores:

- Definiciones de misiones de `src/data.js`.
- `src/mission-system.js`.
- Catálogo global `src/dialogues.js`.
- Registro global `src/npcs.js`.
- Lógica específica de `src/doctor-mission.js` que haya sido reemplazada.
- Fachadas temporales sin consumidores.

Criterio de salida:

- No queda una arquitectura vieja paralela.

### Fase 7 — Documentación y auditoría final

Acciones:

- Actualizar README, índice, estado y documentación de contenido.
- Ejecutar pruebas completas.
- Ejecutar auditoría de dependencias y tamaños.
- Realizar recorrido real en navegador.

Criterio de salida:

- La documentación coincide con la estructura física final.

---

## 23. Estrategia para evitar trabajo duplicado

1. No crear nuevos catálogos globales temporales.
2. Mover y eliminar la definición anterior en la misma fase.
3. Usar adaptadores solamente para conservar imports durante la transición, nunca como fuente de datos.
4. No implementar una mecánica dos veces; primero se crea su handler y luego se migra el contenido.
5. No dividir archivos solo por número de líneas: cada módulo debe tener una responsabilidad clara.
6. No actualizar documentación como si una fase estuviera terminada antes de completar su criterio de salida.
7. No cambiar reglas jugables durante la reestructuración salvo corrección comprobada de un defecto.
8. Detener la migración si una fase no conserva las pruebas de regresión.

---

## 24. Riesgos y mitigaciones

### Riesgo: dependencias circulares

Mitigación:

- Solo `bootstrap.js` conecta capas.
- Los índices exportan hacia afuera; módulos internos no importan desde el índice de su propia carpeta.
- Prueba de arquitectura sobre imports.

### Riesgo: duplicar recompensas al reanudar

Mitigación:

- IDs estables de efectos.
- `appliedEffects` persistido.
- Aplicación idempotente.

### Riesgo: perder partidas existentes

Mitigación:

- Migración v16 → v17 pura y probada.
- Fixtures de guardados reales anonimizados.
- Conservación de la migración de IDs antiguos.

### Riesgo: crear demasiadas abstracciones

Mitigación:

- Solo se introduce una interfaz cuando existen al menos dos consumidores o una necesidad clara de extensión.
- Los archivos de contenido continúan siendo objetos JavaScript simples.
- No se añade un framework de inyección de dependencias.

### Riesgo: handlers demasiado específicos

Mitigación:

- Los handlers se diseñan por mecánica, no por misión.
- Datos y resultados especiales permanecen en la carpeta de contenido.
- Prueba que impida condicionales por ID.

### Riesgo: sobredividir Phaser

Mitigación:

- La escena conserva coordinación.
- Se extraen controladores únicamente por responsabilidad estable.
- No se reparten métodos íntimamente relacionados entre archivos arbitrarios.

### Riesgo: textos todavía incrustados

Mitigación:

- Prueba estática sobre escenas, handlers y vistas.
- Todo texto narrativo debe resolverse desde un bundle de contenido.
- Los textos puramente técnicos de UI usarán un catálogo diferente.

---

## 25. Fuera de alcance durante la migración

- Agregar una segunda saga.
- Crear nuevas misiones.
- Rediseñar balance de combate.
- Sustituir la marioneta visual.
- Añadir servicios en línea.
- Implementar varios idiomas completos.
- Eliminar todavía la herramienta de pruebas antes de que deje de ser necesaria.

La arquitectura quedará preparada para estas tareas, pero no deben mezclarse con la migración.

---

## 26. Criterios de aceptación finales

La reestructuración estará terminada solamente cuando se cumplan todos los puntos siguientes:

### Contenido

- [ ] Las cinco principales son `m01`–`m05`.
- [ ] Las dos secundarias son `s01`–`s02`.
- [ ] Cada misión tiene su propia carpeta.
- [ ] No existen misiones en `src/data.js`.
- [ ] No existe un catálogo global creciente de diálogos.
- [ ] Cada personaje tiene una única definición.

### Motor

- [ ] Todas las misiones se ejecutan mediante `mission-runner`.
- [ ] Todos los pasos tienen un handler registrado.
- [ ] Los requisitos se evalúan mediante `condition-evaluator`.
- [ ] Los efectos se aplican mediante `effect-runner`.
- [ ] El catálogo completo pasa el validador.
- [ ] No hay condicionales por ID de misión fuera de contenido, migraciones y pruebas.

### Principales y secundarias

- [ ] Las principales aparecen exclusivamente en el Cuartel.
- [ ] Las secundarias aparecen exclusivamente en el Tablón.
- [ ] Los requisitos pueden cruzarse sin mezclar interfaces.
- [ ] No existen banderas de desbloqueo redundantes.

### Diálogos

- [ ] Briefings, decisiones y escenas usan bundles localizados.
- [ ] Los diálogos validan propietario, paso y superficie.
- [ ] Los speakers referencian personajes registrados.
- [ ] Las variables son compatibles entre idiomas.
- [ ] El motor de diálogo no depende de DOM o Phaser.

### Guardado

- [ ] El esquema vigente es v17.
- [ ] Guardados v16 migran sin perder progreso.
- [ ] Guardados con IDs históricos migran correctamente.
- [ ] Una misión activa se reanuda desde su paso.
- [ ] Los efectos no se duplican al recargar.
- [ ] El estado desbloqueado se calcula y no se persiste.

### Ciclo de vistas

- [ ] Solo existe una vista meta activa.
- [ ] Solo existe un canvas Phaser.
- [ ] Solo existe un overlay modal.
- [ ] Cambiar de vista cancela listeners y tareas anteriores.
- [ ] Salir de Phaser destruye su instancia.
- [ ] Una respuesta asíncrona antigua no reemplaza la vista actual.

### Tamaño y dependencias

- [ ] `game.js` queda como entry point de hasta 150 líneas.
- [ ] La antigua responsabilidad de `meta-ui.js` está dividida por vistas.
- [ ] Ningún archivo supera el límite correspondiente sin excepción documentada.
- [ ] `content` y `engine` no importan DOM o Phaser.
- [ ] Las pruebas de arquitectura pasan.

### Verificación

- [ ] Todas las pruebas unitarias pasan.
- [ ] Todas las pruebas de integración pasan.
- [ ] Todas las migraciones pasan.
- [ ] El recorrido real de campaña pasa en navegador.
- [ ] No aparecen errores de consola.
- [ ] La documentación coincide con la implementación final.

---

## 27. Decisiones que quedan fijadas por este plan

Salvo modificación explícita de este documento, se consideran decididas las siguientes reglas:

1. Los IDs principales continúan como `m01`–`m05` y se expanden consecutivamente.
2. Los IDs secundarios usan su propia serie `s01`, `s02`, etcétera.
3. Principales y secundarias usan catálogos y consultas separados.
4. Las dependencias entre ambas se expresan mediante requisitos.
5. Las misiones viven junto a sus diálogos y configuración específica.
6. El motor es independiente del contenido concreto.
7. Los pasos se ejecutan mediante handlers registrados.
8. Los desbloqueos derivados no se guardan como banderas duplicadas.
9. Los diálogos validan idioma, propietario y ubicación.
10. El guardado conserva el paso real de una misión activa.
11. Cambiar de superficie cancela la anterior y destruye recursos incompatibles.
12. Los límites de tamaño se verifican automáticamente.
13. No se agregará contenido nuevo hasta terminar la migración estructural.
14. No habrá dos fuentes editables de verdad durante la transición.

---

## 28. Resultado esperado

Al terminar esta migración, agregar una misión debería consistir en:

1. Crear una carpeta.
2. Declarar su `mission.js`.
3. Añadir sus `dialogues.js`.
4. Registrar la misión en su saga.
5. Reutilizar handlers existentes o crear uno nuevo si la mecánica es realmente nueva.
6. Ejecutar las pruebas del catálogo.

No debería ser necesario modificar:

- El Cuartel.
- El Tablón.
- El esquema general del guardado.
- El runner.
- Otras misiones.
- La navegación global.
- La lógica base de Phaser.

Ese es el criterio práctico que determinará si la arquitectura es verdaderamente escalable.
