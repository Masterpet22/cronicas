# Transiciones de misiones

Cada misión puede elegir su transporte en el campo `transitions` de su archivo `mission.js`. Si se omite, se usan **rutas**. No se escoge al azar.

```js
transitions: {
  departure: "route",             // Salida desde la aldea.
  betweenEncounters: {
    default: "route",             // Los demás cambios de encuentro usan ruta.
    3: "teleport"                 // Llegada al tercer encuentro por transportación.
  },
  return: "teleport"              // Regreso; conserva el informe y las recompensas.
}
```

Para usar el mismo modo entre todos los encuentros, basta `betweenEncounters: "teleport"` o `"route"`. Los números del objeto son los **encuentros de destino**, comenzando en 2, dentro del recorrido que se juega. Si un acceso evita un rival, la numeración cuenta solo los encuentros restantes. Los errores de nombres o números se detectan en `validateMissionCatalog` y en las pruebas de contenido.

Por ejemplo: «En la misión 2, salida por ruta, transportación al tercer encuentro y regreso por ruta». Solo requiere editar ese bloque; no hay que modificar escenas, recompensas ni diálogos.

## Secuencia de transportación

1. Aparece el humo de salida con el personaje todavía presente.
2. Bajo el humo, el personaje se sustituye por el objeto elegido. El humo se disipa y deja ver el objeto.
3. El objeto desaparece por completo.
4. La pantalla se oscurece y cambia el destino.
5. Aparece el humo de llegada, con el personaje todavía oculto.
6. El personaje aparece entre el humo y este se disipa.

La subida de nivel durante un combate comparte con la Sustitución su animación rápida: 660 ms de salida y 130 ms de llegada, además del fundido de pantalla. La notificación de nivel se ejecuta en paralelo, sin añadir una espera antes de sustituir al personaje. El objeto elegido aparece una sola vez, al salir del combate. Al volver desde la pantalla de nivel se usa solo humo; no se deja ni se crea otro objeto. El informe de resultados es una interfaz, no un destino físico.

## Objeto de apariencia

Se elige en **Dojo → Apariencia → Transportación**. La selección se guarda en `character.teleportObject`, de forma independiente en cada partida, y se usa tanto al sustituir al jugador durante una evasión en combate como al salir para subir de nivel o viajar por transportación. Los rivales conservan su propio objeto predeterminado. Las partidas anteriores usan `log` (tronco). Valores disponibles: `log`, `dog` (perrito), `chair` (silla).

Para añadir otro objeto, se añade su archivo y una entrada en `src/teleport-objects.js` con ID, nombre, textura, archivo, ancho y alto. El selector de apariencia y la carga de texturas leen ese catálogo.

La animación vive en `src/battle/teleport-transition.js`; emite eventos `teleport-stage` para observar sus seis pasos. Con movimiento reducido disminuyen la expansión y la cantidad de humo; los viajes también reducen sus tiempos. Si la escena se cierra, la transición se interrumpe y libera sus objetos.
