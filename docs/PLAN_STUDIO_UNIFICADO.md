# Crónicas Studio — Plan histórico de unificación

Estado: sustituido el 2026-10-11 por [`CRONICAS_STUDIO.md`](CRONICAS_STUDIO.md), que es el plan canónico y conserva el desglose vigente de las fases. Este documento se mantiene únicamente como registro de la propuesta inicial; sus estados y numeración no deben usarse para decidir trabajo nuevo.

## Objetivo
Una única aplicación web gratuita, enteramente en español, que combine calibración, animación, recursos de sprites, vestuario y vista previa; basada en la propuesta visual elegida (timeline multipista, lienzo central, inspector y vista fantasma activable).

## Reglas de arquitectura
- Conservar URLs antiguas `puppet-calibrator.html` y `animation-studio.html` durante la migración.
- Respetar `src/animations/rig.js`, `runtime.js`, `clips.js` y `studio-runtime.js`; no cambiar IDs técnicos de articulaciones.
- Mantener editor y juego desacoplados: los datos se exportan como JSON validado y se adaptan al runtime de combate.
- Sin licencias comerciales ni backend obligatorio; GitHub Pages es estático.
- El proyecto une anatomía, calibración, animaciones y recursos; la vestimenta concreta la escoge el jugador, no la animación.
- Piezas, ropa y equipamiento siguen jerarquías y puntos de anclaje. Las variantes `open/fist/grip` de manos y `stand/step/kick` de pies se resuelven por estado o eventos.
- Calibración masculino/femenino independiente y movimientos compartidos cuando la topología coincide.
- Guardado local y exportación importación explícita; no prometer commits directos desde Pages.

## Distribución de la interfaz
- Cabecera: proyecto, pestañas **Calibrador / Animador / Sprites / Exportar**, guardar.
- Izquierda: árbol de piezas y huesos, buscador, capas y pistas.
- Centro: lienzo de sprites con zoom/pan, guías, pivotes, selección y transformaciones.
- Derecha: inspector contextual con posición, rotación, escala, pivotes, opacidad, variantes.
- Abajo: timeline multipista con controles de reproducción, eventos y claves.
- Vista fantasma (*onion skin*) opcional, con muestras anteriores/siguientes, opacidad y cantidad regulables; **desactivada en cualquier momento**.

## Estructura prevista
```text
cronicas-studio.html             # entrada única y navegación
src/studio/state.js              # almacén único de proyecto y modo
src/studio/calibration.js        # pivotes, partes y jerarquía
src/studio/animation.js          # pistas, fotogramas clave, poses
src/studio/renderer.js           # dibujo con onion skin
src/studio/skins.js              # slots, variantes y ropa
src/studio/persistence.js        # guardado y exportaciones
src/animations/studio-runtime.js # sampler compartido existente
```

## Fases y criterios
### Fase 1 — Unificación inicial
- Crear entrada `cronicas-studio.html` con navegación consistente y accesos a herramientas existentes.
- Compartir, al menos, calibraciones entre modos sin exportación manual y preservar los datos durante la navegación.
- Mantener la interfaz en español y no alterar el combate.
- Usar una transición segura: **integración de vistas existentes** hasta que un lienzo nativo compartido esté listo.
- Entrega: código en rama y PR en borrador, listo para pruebas.

### Fase 2 — Lienzo y esqueleto unificados
- Reemplazar vistas embebidas por lienzo, inspección y jerarquía comunes.
- Configurar y validar las anatomías masculina y femenina.
- Manipuladores de rotación/traslación y herramientas de cámara.
- Tests de pivotes, proporcionalidad y coordenadas.

### Fase 3 — Editor de animación avanzado
- Línea de tiempo multipista; copiar, pegar, duplicar y arrastrar claves.
- Interpolación lineal, escalonada y curvas; eventos y velocidad.
- Sombras activables de fotogramas previos/siguientes, cantidad y opacidad ajustables.
- Deshacer/rehacer, selección múltiple y atajos.

### Fase 4 — Sprites, ropa y variantes
- Sustituir imágenes por ranura, animar variantes, preparar equipamiento por anatomía.
- Sockets de armas, orden de dibujo variable, resolver ropa según avatar.
- Vista previa con avatar y equipamiento alternativos.

### Fase 5 — Integración con juego y publicación final
- Adaptador de clips Studio -> runtime Phaser.
- Pruebas de regresión de combate, perfiles, animaciones, restauración, exportaciones.
- Fusionar a `main` después de validar; verificar GitHub Pages.

## Formato de datos y compatibilidad
- `calibration`: `{version:2,parts:[{id,x,y,rotation,scaleX,scaleY,visible,z}]}`.
- `animation`: `{schema:"cronicas-studio/v1",rig:"humanoid",anatomy:"male",animation:{id,duration,loop,keys}}`.
- Usar nombres españoles en UI, identificadores estables en JSON.
- Persistencia inicial local por origen y transferencia explícita a la entrada única; tener en cuenta cuotas y modo privado.
- No asumir que una calibración masculina sirve para el modelo femenino.

## Riesgos y límites de fase 1
- La interfaz integrada mediante vistas heredadas aún no representa el diseño definitivo.
- Calibración compartida debe validarse: valores modificados por jugador/desarrollador requieren normalización.
- Las páginas antiguas pueden abrirse por separado y continuar con su comportamiento histórico.
- El onion skin y la línea de tiempo avanzada quedan programados para fase 3, no fingir que ya funcionan.


## Actualización de implementación — lienzo e interfaz unificados (2026-10-11)
- Implementado un único lienzo Canvas 2D en `cronicas-studio.html`, sin iframe, para calibrador y animador.
- Estado común de piezas, calibración, huesos, clips, tiempo, selección y modo; persistencia local y exportación/importación de proyecto completo.
- Se utilizan los sprites del juego y `rig.js`/`studio-runtime.js`, con jerarquía de huesos para la vista previa.
- Nueva distribución con lista izquierda, lienzo central, inspector derecho y línea de tiempo inferior. Barra de herramientas con zoom, pan, cuadrícula y visualización de huesos.
- Vista fantasma activable con opacidad ajustable y una pose anterior/siguiente.
- Editor de claves de rotación y selector de tiempo en la línea inferior.
- Pendiente: pruebas completas en navegador, calibración femenina, arrastre multipista avanzado, editor de curvas y variantes de sprites; la vista fantasma actual se basa en posiciones temporales adyacentes, no en fotogramas históricos independientes.
- La integración con el motor de combate sigue pendiente: exportar proyecto no incorpora automáticamente clips a `clips.js`.
