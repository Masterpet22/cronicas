# Línea base de rendimiento — Phaser 4, fase 0

## Uso durante el desarrollo

1. Abrir **PRUEBAS → Medir rendimiento** y activar el checkbox.
2. Iniciar una misión. El panel acompaña viajes, combate, pausa, informes y subida de nivel.
3. Seleccionar el nombre del escenario y pulsar **Iniciar muestra** para reiniciar tiempos y picos.
4. Reproducir la situación y pulsar **Guardar muestra**. El selector etiqueta la medición; no altera el combate.
5. **Exportar JSON** descarga las muestras. También se puede exportar desde PRUEBAS al regresar a la aldea.

La opción está apagada por defecto y se recuerda localmente. Sin activarla no se recorren
objetos por frame, no hay panel ni temporizador de refresco. Al salir de Phaser o desactivarla
se retiran los listeners y el temporizador. Se conservan como máximo 30 muestras en memoria;
la colección se pierde al recargar. No hay telemetría ni envío de datos.

## Qué se mide

- Renderer efectivo, versión de Phaser y descripción gráfica cuando WebGL permite consultarla.
- Resolución física del canvas, tamaño lógico de combate (960×540), tamaño CSS, escala de render y DPR.
- FPS medio, frame medio, mediana, p95, máximo y número de frames por encima de 33,33 ms.
- Tiempo medio de CPU desde `prestep` hasta `postrender`.
- Objetos residentes, emisores, partículas vivas y controladores de filtros, con valores actuales y picos por escena.
- Límites por escena y una lista de excesos exportable en JSON.

La cadencia usa diferencias de `performance.now()` entre eventos `postrender`, sin suavizado
ni el delta limitado de Phaser. Los FPS son `frames * 1000 / suma(intervalos)`. El tiempo de CPU
incluye actualización y envío del render; **no es una medición de tiempo GPU**.
La ventana está limitada a los últimos 600 intervalos; los picos de recursos abarcan toda
la captura. Ocultar o volver a mostrar la pestaña corta el intervalo para no contar el tiempo
en segundo plano. Cambiar el modo ligero reinicia la ventana y los picos para no comparar
filtros del modo anterior con el presupuesto nuevo.

Se cuentan también piezas anidadas y objetos ocultos residentes, una sola vez por referencia;
los objetos no son draw calls. Las partículas se contabilizan aparte de sus emisores.
Los filtros incluyen listas internas y externas de objetos y cámaras, incluso controladores
configurados en objetos ocultos. Las escenas pausadas visibles siguen apareciendo porque se renderizan.

El contador añade trabajo de CPU mientras está activo; comparar siempre con el mismo protocolo.

## Presupuestos iniciales

Fuente ejecutable: `src/dev/performance-metrics.js`.

| Escena | Objetos | Partículas vivas | Emisores | Filtros |
| --- | ---: | ---: | ---: | ---: |
| Combate | 450 | 64 | 6 | 2 |
| Viaje | 100 | 24 | 1 | 0 |
| Pausa | 120 | 0 | 0 | 0 |
| Informe principal | 160 | 0 | 0 | 0 |
| Informe secundario | 160 | 0 | 0 | 0 |
| Subida de nivel | 240 | 0 | 0 | 0 |
| Epílogo | 160 | 0 | 0 | 0 |
| Escena todavía sin perfil | 800 | 96 | 8 | 3 |

En Canvas el límite de filtros es cero. En modo ligero los límites de filtros, emisores y
partículas son cero. Los límites de objetos no cambian: interfaz y personajes se conservan.
Activar modo ligero durante el combate retira filtros y emisores ya existentes, incluidos los del impacto y la preparación;
las técnicas siguientes usan sus variantes simples. El desenfoque del panel tampoco se crea
con movimiento reducido.

La calibración inicial del combate observó aproximadamente 290–296 objetos, cuatro emisores
de preparación y hasta dos filtros simultáneos. El límite de 450 deja margen para sellos,
impactos, recompensas y transiciones sin permitir crecimiento sin control. Los límites de las
otras escenas son presupuestos iniciales; esta matriz no constituye una medición exhaustiva
de todos sus estados narrativos.

Objetivo orientativo: 60 FPS, frame medio cercano a 16,67 ms y p95 menor de 33,33 ms.
Los FPS no son una condición rígida de CI porque dependen del equipo y del renderer del navegador.
Los excesos de recursos, errores del navegador o muestras con menos de cinco intervalos sí
hacen fallar el benchmark. No elevar presupuestos solo para ocultar una regresión.

## Receta repetible

```powershell
npm run performance:test
npm run performance:baseline
```

Se usa Chromium headless, DPR 1, movimiento reducido desactivado y un contexto nuevo por
combinación. El navegador y el servidor iniciado por el script se cierran incluso si falla.
Las partidas viven en contextos aislados del navegador de pruebas.

Matriz: 1366×768, 1600×900 y compacto horizontal 844×390; cada tamaño se ejecuta con
WebGL normal, WebGL ligero y Canvas normal. WebGL no disponible se registra como omitido,
sin sustituirlo silenciosamente. Conviene repetir con el mismo Chromium y sin otras pruebas
de navegador en paralelo.

La receta usa el combate real de la segunda misión, primer rival del pantano, personaje
masculino de fuego de nivel 8 con cuatro técnicas, semilla Phaser `cronicas-phase-0`, música,
destellos y sacudidas desactivados. Se detiene el avance de la línea temporal para aislar la
presentación; no se ejecutan decisiones aleatorias, daño ni recompensas.

| Escenario | Preparación |
| --- | --- |
| `battle-entry` | HUD y dos combatientes en reposo después de crear la escena; tiempo de arranque registrado aparte. |
| `charged-turn` | Ambos combatientes preparando una técnica en el tramo 80–100 %, con poses, cintas y emisores reales. |
| `elemental-technique` | Animación de Aliento de brasa e impacto de fuego a los 250 ms; sin esperar entradas de sellos ni alterar PV. |

Cada muestra dura 3000 ms y conserva el número real de intervalos. Después se reproduce de
nuevo el escenario y se congela el bucle después del render a los 150 ms (entrada/preparación) o 300 ms (técnica) para tomar
un PNG estable, sin activar el menú de pausa ni ocultar acciones. En escritorio se captura
la ventana; en compacto, la página completa para incluir combatientes y acciones situados
debajo del primer pliegue (el viewport de prueba sigue siendo 844×390). Esa pausa y el coste
de capturar el PNG quedan **fuera de la muestra de rendimiento**.

## Resultados y comparación

- `artifacts/phaser-performance/baseline.json`: entorno, GPU declarada, muestras, escalas, picos, presupuestos, errores y omisiones.
- `artifacts/phaser-performance/baseline.md`: resumen tabular generado.
- `artifacts/phaser-performance/*.png`: 27 referencias si están disponibles ambos renderers.

La ejecución sobrescribe estas referencias: conservar la revisión anterior en Git o copiarla
antes de comparar. Revisar primero identidad de escenario, renderer, resolución, DPR, modo y
equipo; después comparar frames, p95 y picos de recursos. En headless, WebGL puede utilizar
renderizado por software: consultar `graphics.renderer` antes de atribuir FPS bajos al jugador
o recomendar cambios automáticos de renderer.

Esta fase crea la línea base; no introduce perfiles ambientales de arena ni filtros nuevos.

## Primera ejecución registrada

El 26 de octubre de 2026 se completaron las 27 muestras de 3000 ms sin errores del navegador,
excesos de presupuesto ni combinaciones omitidas. Los picos observados fueron 296 objetos,
28 partículas vivas, cuatro emisores y dos filtros; el modo ligero mantuvo cero emisores,
partículas y filtros en los tres escenarios.

Chromium declaró **ANGLE / SwiftShader (Vulkan, Subzero)**: WebGL se ejecutó por software.
La matriz registró aproximadamente 9–41 FPS en WebGL y 32–60 FPS en Canvas, según tamaño
y escenario. Son datos de este entorno de referencia, no una estimación del rendimiento
con GPU del jugador. Los valores exactos, p95 y configuración están en el JSON generado.
