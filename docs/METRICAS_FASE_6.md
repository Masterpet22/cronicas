# Validación del guardado

El esquema de archivo vigente es 29. Cada una de las tres ranuras locales
conserva personaje, experiencia, afinidades, rangos, equipo, inventario, decisiones
y progreso por misión. El contrato de juego está en [BALANCE_COMBATE.md](BALANCE_COMBATE.md).

`campaign.missionProgress` registra estado, paso actual, pasos completados,
contexto, efectos aplicados e intentos. Reanudar conserva cursor y decisiones;
un combate pendiente comienza desde su paso de combate.

Los rangos se validan por nivel, predecesoras, casilla y presupuesto. Los puntos
que no corresponden a inversiones válidas quedan disponibles. Repetir la carga
conserva el mismo saldo. El orden de las entradas del archivo no altera las rutas.

Las ganancias de combate se confirman al aceptar el informe y regresar. Los
historiales evitan pagos duplicados. Los consumibles gastados permanecen usados.

`save.js` expone el API de persistencia y progreso. Los módulos de `src/save/`
gestionan ranuras, normalización, estado de personaje y continuidad de campaña.
Las pruebas de guardado, recompensas y victoria forman parte de `npm test`.
