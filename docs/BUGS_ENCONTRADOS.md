# Hallazgos durante el refactor

Este archivo registra anomalías encontradas durante reorganizaciones que no deben mezclarse con cambios de comportamiento.

## Fase 1

- `campaign.sayoRelicPending` y `campaign.sayoRelicDelivered` solo aparecen en el esquema y la normalización v16; no tienen productores ni consumidores actuales. No se eliminaron porque esa limpieza pertenece a la migración v17.
- `campaign.rank` y `campaign.elementRank` se leen y persisten, pero la saga actual no contiene una transición que los modifique. No hay fallo observable con el contenido vigente; se deja anotado para revisar cuando existan ascensos reales.
