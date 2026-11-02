# Estado de campaña

La campaña utiliza el esquema de guardado 29. Sus reglas de progresión y
recompensas se definen en [BALANCE_COMBATE.md](BALANCE_COMBATE.md).

## Historial y estado persistente

| Datos | Función |
|---|---|
| `completedMissions` | Misiones principales completadas; evita duplicar recompensas |
| `completedSecondaryMissions` | Contratos y pruebas especiales de afinidad completados |
| `missionProgress` | Paso actual, contexto, intentos, efectos aplicados y estado de cada misión |
| `banditPrisonerChoice`, `hideoutEntryChoice`, `hideoutDiscoveryChoice` | Decisiones narrativas |
| `archiveUnlocked`, `doctorBookDeliveryPending` | Entrega del libro y acceso al bestiario |
| `doctorRoute`, `doctorSupplyBonus`, `hideoutSupplies` | Ruta elegida y recursos de la búsqueda |
| `secretWarehouseLooted` | Cobro único de la bonificación del almacén |
| `tutorialSeen`, `npcIntroductions`, `sayoEncounterSeen`, `seenMissionNotices` | Presentaciones y avisos ya vistos |
| `rank` | Rango narrativo mostrado en la interfaz |
| `elementRank` | Proyección validada de las ranuras de afinidad habilitadas |

`campaignFlag` obtiene los accesos narrativos desde el historial, las decisiones
y las entregas. El nivel 15 y la segunda prueba completada abren la segunda
ranura; el nivel 30 y la tercera prueba completada abren la tercera. Los nombres
de esas pruebas y la exigencia de elegir primero la segunda afinidad proceden
del contenido registrado. El rango narrativo no sustituye esos requisitos.

## Recompensas y continuidad

Cada misión declara nivel recomendado y perfil de recompensa. El registro
calcula el presupuesto total de PX y su parte de finalización. Los encuentros y
la misión consumen partes del mismo presupuesto. Cambiar de ruta conserva el
total, y completar una misión ya registrada devuelve cero ganancias adicionales.

La victoria en combate es provisional hasta aceptar el informe y volver a la
aldea. La retirada y derrota descartan esas ganancias. Los objetos consumidos
siguen gastados. Una actividad de investigación o búsqueda registra el cierre y
sus recompensas una sola vez. Las decisiones y pasos persisten para reanudar.

## Archivos responsables

- `src/content/index.js`: registro y presupuestos de las misiones.
- `src/mission-rewards.js`: proporciones, bonos, pesos y redondeo del reparto.
- `src/mission-system.js`: requisitos, valores derivados y validación del catálogo.
- `src/save.js`: transacciones de progreso, experiencia y finalización.
- `src/save/campaign-state.js`: pasos, intentos y continuidad.
- `src/battle/victory-transaction.js`: confirmación o descarte de victoria.

La carga valida las referencias y conserva el estado coherente del personaje.
Los historiales principal y secundario determinan la finalización, sin depender
de la numeración del identificador de una misión.
