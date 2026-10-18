# Sistema escalable de misiones y diálogos

Este documento define el contrato vigente para ampliar la campaña sin volver a mezclar contenido, guardado e interfaz. La lista canónica del contenido jugable sigue en [`ESTADO_ACTUAL.md`](ESTADO_ACTUAL.md).

## Separación de responsabilidades

| Capa | Archivo | Responsabilidad |
| --- | --- | --- |
| Contenido | `src/data.js` | Define misión, categoría, tablero, requisitos, flujo y efectos. No renderiza. |
| Reglas | `src/mission-system.js` | Evalúa requisitos, estado, pasos y efectos; valida el catálogo. No conoce pantallas. |
| Texto | `src/dialogues.js` | Guarda líneas por clave, idioma, condiciones y ubicación permitida. |
| Presentación | `src/meta-ui.js` y `game.js` | Ejecuta pasos semánticos y muestra el resultado. No decide desbloqueos por número de misión. |
| Persistencia | `src/save.js` | Guarda progreso y aplica efectos declarados. No contiene una cronología paralela. |
| Ciclo de vistas | `src/view-runtime.js` | Garantiza una única vista HTML activa y desmonta listeners y overlays anteriores. |

Las principales usan `category: "main"` y `board: "headquarters"`. Las secundarias usan `category: "secondary"` y `board: "missions"`. Un requisito puede cruzar categorías, pero una misión nunca cambia de tablero por ello.

## Contrato de una misión

```js
{
  id: "m06",
  number: 6,
  category: "main",
  board: "headquarters",
  dialogueId: "mission.m06.briefing",
  requirements: [
    { type: "main-completed", id: "m05" },
    { type: "level", minimum: 4 }
  ],
  flow: [
    { type: "dialogue" },
    { type: "investigation", id: "harbor-clues" },
    { type: "choice", id: "harbor-route" },
    { type: "combat", id: "harbor-ambush" }
  ],
  completionEffects: [
    { type: "set-flag", id: "harborResolved", value: true }
  ]
}
```

Los IDs son consecutivos: `m01`, `m02`… para principales y `s01`, `s02`… para secundarias. `validateMissionCatalog` rechaza saltos, duplicados, referencias inexistentes, pasos sin ID y tipos no registrados.

### Requisitos disponibles

- `main-completed` y `secondary-completed`: dependen de otra misión de la categoría correcta.
- `flag`: compara una bandera de campaña con `value` o con `true` por defecto.
- `level`: exige un nivel mínimo.
- `all` y `any`: componen requisitos anidados.

### Pasos disponibles

- `dialogue`, `combat`, `investigation`, `route`, `choice`, `resource` y `consequence`.

El `type` elige la familia de mecánica; el `id` describe su significado. El código consulta esos valores mediante `missionHasStep` o `missionStep`, nunca mediante comparaciones como `mission.id === "m04"`. Las propiedades adicionales, por ejemplo `afterEncounter`, indican cuándo ejecutar el paso.

Para introducir una mecánica realmente nueva se añade su tipo a `MISSION_STEP_TYPES`, se crea un ejecutor para ese tipo y se prueba de forma aislada. No es necesario modificar los requisitos, el guardado, los tableros ni la numeración.

### Efectos disponibles

- `set-flag`: asigna un valor persistente.
- `sum-flags`: calcula un valor desde varias banderas.
- `context-flag`: persiste un resultado que entrega el ejecutor de la misión.

Los efectos se aplican solamente al completar la misión. Si aparece una nueva clase de efecto, debe registrarse en `MISSION_EFFECT_TYPES` y en `applyMissionEffects`.

## Diálogos y traducción

Las misiones y NPC guardan claves, no texto incrustado. El catálogo español vive en `src/dialogues.js`; un idioma futuro debe repetir las mismas claves en otro catálogo.

```js
"mission.m06.briefing": [
  { speaker: "ren", text: "Ve al puerto, {player}." },
  { speaker: "sayo", text: "Busca tres marcas.", when: { type: "flag", id: "archiveUnlocked" } }
]
```

`getDialogue` admite:

- `locale` para seleccionar el idioma con español como respaldo.
- `variables` para interpolar nombres y datos sin duplicar traducciones.
- `save` para evaluar la condición opcional `when` de cada línea.
- `placement` para comprobar superficie y propietario. Un briefing de `m06` solo puede aparecer como `mission-briefing` de `m06`; la introducción de un NPC solo en la introducción de ese NPC.

`getMissionSceneDialogue` aplica el mismo control a tutoriales, decisiones y consecuencias dentro de combate. `validateDialogueReferences` comprueba que cada misión tenga una clave existente y asignada a su propietario. Las nuevas escenas deben adoptar el mismo patrón: claves estables y texto fuera de la lógica.

## Regla de ciclo de vida de pantallas

Toda vista HTML se monta mediante `viewRuntime.replace`. El cambio de vista aborta los listeners registrados con el `signal` de su ámbito, ejecuta limpiezas, elimina overlays transitorios y sustituye el árbol anterior. Los diálogos y decisiones se montan con `mountOverlay`.

Al salir de Phaser hacia una vista HTML, `releaseGameToMeta` oculta el canvas, monta la ubicación solicitada y destruye la instancia de Phaser en la siguiente microtarea. Una misión secundaria que vuelva a necesitar Phaser crea una instancia aislada nueva. No se permite conservar escenas dormidas detrás de otras pantallas.

## Lista de comprobación para añadir contenido

1. Añadir la misión al catálogo correcto con el siguiente ID consecutivo.
2. Declarar requisitos, pasos y efectos; evitar condicionales por ID.
3. Añadir su `dialogueId` y líneas en cada idioma disponible.
4. Añadirla a una saga solo si es principal; las secundarias permanecen en su tablero.
5. Ejecutar `npm test` y corregir cualquier error del validador.
6. Probar desbloqueo, reanudación, finalización y retorno a la aldea verificando un solo canvas o vista activa.

