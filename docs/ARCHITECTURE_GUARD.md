# Guardia arquitectónica de contenido

`tests/architecture.test.mjs` protege `game.js` y todos los módulos de `src/`, salvo el catálogo `src/data.js`.

La prueba impide que un ID literal de misión o de paso controle comportamiento fuera del catálogo. También rechaza cualquier llamada a `missionStep` o `missionHasStep` con un tercer argumento literal. Así, agregar contenido debe consistir en declarar flujo, requisitos y modificadores, no en abrir nuevos condicionales repartidos por la interfaz, el combate o el guardado.

Si una migración de compatibilidad obliga a conservar temporalmente un literal, la excepción debe ser de una sola línea e incluir archivo, ID, texto exacto de la línea, motivo concreto y fecha ISO. No se permiten exclusiones globales ni por archivo completo.
