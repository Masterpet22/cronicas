# Línea temporal de combate

Fecha de actualización: 2026-10-21.

## Objetivo

La barra de velocidad representa iniciativa real. Jugador y enemigo tienen progreso propio, avanzan con las mismas reglas y conservan su posición cuando el otro actúa.

## Recorrido

- La barra va de 0 % a 100 % y muestra hitos `>>` en 20 %, 40 %, 60 % y 80 %.
- El tramo 0–80 % acumula iniciativa según la velocidad efectiva del combatiente.
- Al llegar al 80 %, el combatiente puede comprometer una acción.
- Una acción inmediata se ejecuta en el 80 %.
- Una acción que requiere preparación debe recorrer el tramo 80–100 % antes de ejecutarse.
- Al terminar su acción, solo el combatiente que actuó vuelve al 0 %. El otro conserva el progreso alcanzado.

## Velocidad y tiempos

La tasa base es `0.8 / 1200 ms` para velocidad 10. Antes de elegir una acción se usa exclusivamente la velocidad efectiva del personaje, incluidos modificadores de estados como Empapado.

El tiempo desde 0 % hasta 80 % es:

```text
tiempo_hasta_80 = 12000 / velocidad_efectiva  (milisegundos)
```

Durante 80–100 %, la preparación usa `velocidad_efectiva + speedMod` de la acción, con un mínimo de 1. Esto permite que una técnica rápida prepare antes que una técnica pesada sin alterar la iniciativa ya acumulada.

## Elección y simultaneidad

- Cuando el jugador llega al 80 %, se activa el modo de espera: la línea temporal se pausa hasta que confirme una acción válida.
- Al confirmar, ambos combatientes vuelven a avanzar. Por tanto, el enemigo puede completar una acción durante la preparación del jugador.
- El enemigo elige automáticamente su acción al llegar al 80 % y sigue la misma distinción entre inmediata y preparada.
- En una llegada exactamente simultánea, se resuelven primero las acciones que ya completaron preparación. Entre dos preparaciones completadas, el jugador tiene prioridad; entre dos llegadas nuevas al 80 %, el enemigo decide primero y el jugador recibe después su pausa de elección.

## Acciones actuales

- Inmediatas: Golpe veloz, Guardia y Golpe rápido del enemigo.
- Preparadas: todas las técnicas del jugador con sellos; Golpe pesado, Aguja tóxica y Ascua errante del enemigo.

## Estados y recursos

- Los estados periódicos se resuelven cuando el combatiente afectado completa su propia acción, no al final de una ronda global.
- Los enfriamientos del jugador avanzan al completar una acción propia.
- El jugador recupera 8 de chakra al completar una acción propia; Guardia conserva además su recuperación específica.
- Guardia permanece activa hasta consumir el siguiente ataque enemigo. Mientras siga activa no puede prepararse otra Guardia.
- `round` se mantiene como contador interno de acciones del jugador para compatibilidad e informes; ya no gobierna la iniciativa.

## Lenguaje visual

- Cada combatiente se representa mediante una cresta ilustrada, no con círculos ni partículas geométricas. El color distingue jugador y rival; dorado indica que alcanzó el 80 %.
- Al llegar al 80 % aparece una sola pincelada breve detrás del marcador. No deja estela ni mantiene objetos animados sobre la barra.
- Durante 80–100 %, una técnica preparada cambia la postura de la marioneta, eleva el brazo que cruza el torso al plano frontal y muestra cintas caligráficas acompañadas por emisores reales de motas alrededor de ambas manos. Todo desaparece al ejecutar o cancelar la acción.
- La fase II del jefe se comunica mediante una silueta violeta que copia en cada fotograma las piezas y articulaciones del rival. No existe un modo furia visual independiente ni se dibuja un círculo alrededor del cuerpo.
- El modo ligero conserva la postura, la profundidad anatómica y el estado de los marcadores, pero omite pinceladas, cintas y partículas de preparación.

## Implementación

Las fórmulas puras viven en `src/battle/timeline.js`. La presentación y el planificador viven en `src/battle/scenes/battle-presentation.js`; el compromiso y la resolución de acciones, en `src/battle/scenes/battle-flow.js`. Los PNG transparentes del lenguaje visual viven en `assets/vfx/feedback/` y su procedencia está documentada en el README de esa carpeta.
