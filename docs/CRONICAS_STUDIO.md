# Crónicas Studio — Diseño y plan de implementación

Estado: plan de implementación v3, 2026-10-11. Fases 1, 2 y 3 implementadas en el árbol de trabajo; fases 4 a 6 pendientes.

## Objetivo
Construir un editor web gratuito, integrado con Crónicas, para calibrar personajes modulares, configurar esqueletos masculino/femenino, crear animaciones por fotogramas clave, asociar ropa y variantes de sprites, y exportar resultados reutilizables. El jugador configura el avatar; el desarrollador crea recursos y movimientos.

El resultado principal del Studio no es una captura ni una animación aislada: es un archivo versionado que el juego puede validar, previsualizar y, tras su aprobación, incorporar a su biblioteca sin copiar valores manualmente.

## Estado observado y brecha de integración

- `cronicas-studio.html` ya crea claves multipropiedad, reproduce, pausa, conserva historial e importa/exporta `cronicas-studio/v1`.
- El juego acepta en paralelo clips heredados por `tracks` y clips Studio por `keys`; ambos pasan por `PuppetAnimationController`.
- `studio-adapter.js` convierte un candidato validado en un clip de catálogo sin degradarlo a un único tween.
- Studio y el controlador del juego comparten `sampleKeyframeAnimationPose`; la prueba de paridad compara exactamente las mismas poses en puntos intermedios y finales.
- Exportar un candidato todavía no lo instala automáticamente en la biblioteca del juego: esa aprobación e incorporación pertenecen a la fase 5.

## Principios
1. **Separación**: esqueleto (estructura), anatomía (medidas), movimiento (animación), apariencia (skins y equipo), variantes de sprite (poses de manos/pies), anclajes (armas).
2. **Un solo catálogo de movimiento** para las anatomías compatibles; correcciones por rig cuando el ajuste sea necesario.
3. **Nunca renderizar ropa dentro del archivo de animación**. Cada pieza de ropa se vincula a una ranura y sigue su hueso.
4. **Identificadores estables** para huesos, ranuras, animaciones y variantes.
5. **Sin licencias de pago**; editor y runtime utilizables desde navegador. Publicación estática en GitHub Pages.
6. **Conservar compatibilidad** con `puppet-calibrator.html`, `src/animations/rig.js`, `runtime.js` y `clips.js` hasta completar la migración.

## Modelo de datos propuesto
```json
{
  "schema": "cronicas-studio/v1",
  "rig": "humanoid",
  "anatomy": "male",
  "animation": {
    "id": "attack_sword",
    "label": "Ataque con espada",
    "description": "Corte frontal reutilizable.",
    "category": "ataque",
    "state": "action",
    "status": "draft",
    "duration": 800,
    "loop": false,
    "requires": ["shoulderRight", "elbowRight"],
    "keys": {
      "shoulderRight": [
        {"t": 0, "angle": 0},
        {"t": 240, "angle": -45, "x": 3, "ease": "Cubic.out"},
        {"t": 800, "angle": 0}
      ]
    },
    "spriteEvents": [
      {"t": 180, "slot": "handRight", "variant": "grip"}
    ]
  }
}
```

### Contrato de exportación v1

- `schema`, `rig` y `anatomy` identifican la versión y el cuerpo de previsualización.
- `id` es estable y se usa desde habilidades y escenas; `label` y `description` son presentación para herramientas.
- `state` participa en las prioridades del controlador; `status` distingue borradores de clips aprobados.
- `requires` declara todas las partes del rig sin las cuales el clip no puede reproducirse.
- Cada fotograma contiene `t` y una o varias transformaciones relativas: `x`, `y`, `angle`, `scaleX`, `scaleY` o `alpha`.
- `ease` describe la transición desde la clave anterior. En v1 solo se aceptan curvas nominales compartidas con el runtime; las Bézier libres quedan aplazadas hasta que Phaser pueda evaluarlas igual.
- `spriteEvents` solo guarda tiempo, ranura y variante. No incrusta imágenes ni ropa.
- Los archivos antiguos con solo `id`, `duration`, `loop` y claves de ángulo continúan siendo importables y se normalizan como borradores.

Hay dos niveles de validación:

1. **Proyecto editable:** permite pistas vacías y metadatos incompletos durante el trabajo.
2. **Candidato para el juego:** exige metadatos, objetivos, pistas no vacías, tiempos válidos, propiedades compatibles y eventos reconocibles.

### Esqueleto y anatomías
- Esqueleto lógico `humanoid`: torso, cuello, cabeza, hombros, codos, muñecas, caderas, rodillas y tobillos, con jerarquía de parentesco.
- Anatomías `male` y `female` aportan posiciones de descanso, pivotes, escalas y sprites propios.
- Los clips utilizan rotaciones relativas, no coordenadas absolutas de un único cuerpo.
- Cada anatomía debe calibrarse y validarse con las mismas animaciones. La anatomía femenina requiere su propia calibración antes de declararla completamente compatible.

### Ranuras, prendas y avatares
- Cada hueso admite una o varias ranuras de dibujo (`torso`, `sleeveLeft`, `handRight`, etc.) ordenadas en profundidad.
- Los recursos gráficos contienen imágenes por anatomía y, donde corresponda, por variante.
- El perfil del jugador **solo guarda referencias**: anatomía, cabello, prendas, colores, armas.
- En tiempo de ejecución: cargar rig → aplicar anatomía → construir ranuras con equipo del jugador → calcular movimiento → aplicar cambios de sprite → dibujar.
- Las prendas comunes reutilizan todos los clips; prendas especiales pueden añadir huesos secundarios o correcciones.

### Variantes de sprites y armas
- `handRight`: `open`, `fist`, `grip`; `footLeft`: `stand`, `step`, `kick`.
- Resolución: variante exigida por el evento de animación > estado de equipo > apariencia por defecto.
- Si una prenda no contiene la variante pedida, usar su variante estándar con aviso en el editor.
- Armas montadas sobre sockets (`rightHandGrip`, `backSheath`); la animación puede mover el arma entre sockets.

## Flujo de autor
1. Cargar sprites PNG transparentes.
2. Calibrar pivotes y jerarquía para cada anatomía.
3. Crear animación en línea de tiempo, insertar claves, interpolar y previsualizar.
4. Configurar variantes de manos/pies y sockets.
5. Probar el mismo clip en ambos rigs y con distintas vestimentas.
6. Exportar JSON determinista del proyecto.
7. Ejecutar validación de candidato, comparar su pose en Studio y Phaser y marcarlo como aprobado.
8. Incorporar el clip a la biblioteca del juego; habilidades y escenas solo referencian su `id`.

## Flujo del jugador
1. Selecciona anatomía.
2. Selecciona cabello, cara y ropa.
3. El inventario guarda IDs, no imágenes ni animaciones duplicadas.
4. Al atacar, el juego selecciona el clip según la habilidad y el arma; la ropa sigue los huesos automáticamente.

## Arquitectura implementada
- `puppet-calibrator.html`: conservar como herramienta de calibración.
- `animation-studio.html`: prototipo histórico conservado por compatibilidad.
- `cronicas-studio.html` y `cronicas-studio.css`: entrada canónica y distribución visual del editor unificado.
- `src/studio/editor.js`: estado del proyecto, lienzo, jerarquía, inspector, timeline, historial, importación y exportación.
- `src/animations/rig.js`: base de jerarquía ya existente.
- `src/animations/runtime.js`: muestreo común de clips heredados y de fotogramas clave.
- `src/animations/clips.js`: catálogo de movimientos existentes.
- `src/animations/studio-format.js`: contrato, normalización, validación e importación/exportación determinista.
- `src/animations/studio-runtime.js`: fachada de validación y muestreo del proyecto editable.
- `src/animations/studio-adapter.js`: conversión validada de proyectos Studio a clips del catálogo.
- Futuro: `skins.js` (resolución de slots) y `anatomies.js` (pivotes y escala).

## Plan de implementación detallado

### Fase 0 — Inventario y prototipo de rotación (realizada)

**Propósito:** comprobar que el rig existente puede editarse desde navegador sin afectar el combate.

**Entregado:** selección de articulaciones, claves de ángulo, reproducción determinista básica, duración, bucle e importación/exportación inicial.

**Límite conocido:** el archivo exportado es un proyecto del editor, no un clip consumible directamente por el controlador de Phaser.

### Fase 1 — Contrato de exportación y compatibilidad base (completada)

**Propósito:** convertir el JSON en una interfaz estable entre el editor y el futuro adaptador del juego antes de reconstruir la interfaz visual.

**Entregables:**

- Módulo único `studio-format.js` para crear, validar, normalizar, serializar e importar proyectos.
- Compatibilidad de lectura con los JSON mínimos producidos por el prototipo.
- Metadatos de catálogo: etiqueta, descripción, categoría, estado, estado de aprobación y requisitos del rig.
- Fotogramas multipropiedad con transformaciones relativas y curvas nominales permitidas.
- Eventos de variante de sprite definidos en el contrato, aunque su ejecución se active en una fase posterior.
- Exportación determinista: mismos datos producen exactamente el mismo texto y orden.
- Validación separada para proyecto editable y candidato para el juego.
- Pruebas de migración, ida y vuelta, datos inválidos y muestreo compartido.
- Campos mínimos de metadatos conectados al editor existente.

**Criterios de salida:**

- Un JSON antiguo se importa, normaliza y vuelve a exportar sin perder claves.
- Un proyecto completo supera el modo `game`; uno vacío o incompatible produce diagnósticos concretos.
- `x`, `y`, `angle`, `scaleX`, `scaleY` y `alpha` pueden muestrearse sin modificar la calibración base.
- La suite automatizada permanece en verde.
- No se afirma todavía que el clip esté integrado en combate.

### Fase 2 — Paridad de runtime y adaptador del juego (completada)

**Propósito:** lograr que Studio y Phaser produzcan la misma pose para el mismo archivo y tiempo.

**Entregado:**

- Lector directo de `keys` y adaptador sin pérdida; no se aplana una animación multipista a un solo tramo.
- Compatibilidad simultánea con el catálogo heredado de `tracks`.
- Un reloj por clip Studio: las propiedades concurrentes se muestrean juntas y no crean tweens rivales sobre el mismo objetivo.
- Prioridad, bucle, finalización y restauración neutral permanecen bajo `PuppetAnimationController`.
- Curvas `Linear`, `Sine`, `Quad`, `Cubic` y `Back`, con variantes `in`, `out` e `inOut`, evaluadas por la función compartida.
- Pruebas de paridad Studio/juego, validación de catálogo, IDs duplicados, duración, pose intermedia y restauración final.
- Prueba de integración del controlador con un candidato exportado. La incorporación permanente al catálogo y la prueba de combate editorial siguen reservadas para la fase 5.

**Criterio de salida alcanzado:** diferencia cero en propiedades numéricas entre la previsualización del Studio y el adaptador consumido por el controlador del juego para el conjunto automatizado.

### Fase 3 — Interfaz de autor alineada con la guía visual (completada)

**Propósito:** reconstruir la experiencia del editor sobre el contrato ya estable.

**Entregado:**

- Distribución de escritorio con cabecera de 56 px, árbol izquierdo de 270 px, área central flexible, inspector de 310 px y timeline inferior.
- Navegación superior por Animador, Calibrador, Sprites, Exportar y Proyecto, sin `iframe`.
- Árbol derivado de `rig.js`, capas, búsqueda, visibilidad y bloqueo de edición.
- Inspector separado para transformaciones relativas de animación y valores absolutos de calibración.
- Timeline con regla, pistas por objetivo, claves arrastrables con ajuste a FPS, eventos de sprite, referencia visual y zoom temporal.
- Selección múltiple, copiar, pegar, duplicar, eliminar y atajos de reproducción/herramientas.
- Vista fantasma regulable, miniatura de previsualización y representación de las curvas nominales permitidas.
- Historial serializable de hasta 80 estados para deshacer y rehacer.
- Guardado local recuperable, apertura de JSON, exportación del proyecto y exportación del candidato solo si supera validación `game`.
- Retirada explícita de service workers y cachés antiguas antes de cargar los módulos del Studio.

**Criterio de salida alcanzado:** las operaciones de animación visibles modifican campos del esquema; zoom, cuadrícula, visibilidad, bloqueo y vista fantasma son estado visual del editor. La gestión real de recursos del modo Sprites corresponde a la fase 4.

### Fase 4 — Anatomías, prendas, variantes y armas

**Propósito:** probar que un movimiento es reutilizable y no está horneado para un único cuerpo.

**Tareas:**

- Mover pivotes, escalas y posiciones neutrales a `anatomies.js`.
- Calibrar y validar de forma independiente los rigs masculino y femenino.
- Crear ranuras de cuerpo, cabello, prendas, calzado y arma con profundidad estable.
- Ejecutar `spriteEvents`, variantes de manos/pies y cambios de sockets de arma.
- Mostrar advertencias y degradación cuando una prenda no tenga la variante solicitada.
- Probar cada candidato con ambos rigs y un conjunto mínimo de equipamiento.

**Criterio de salida:** el mismo ID de clip funciona en todas las anatomías declaradas compatibles sin contener coordenadas base ni imágenes.

### Fase 5 — Aprobación e integración al catálogo

**Propósito:** convertir un borrador exportado en un recurso seguro para habilidades, escenas y estados del juego.

**Tareas:**

- Comando de validación de archivos exportados y detección de IDs duplicados.
- Flujo `draft` → revisión en laboratorio y combate → `integrated`.
- Incorporación a una biblioteca cargada por el juego sin copiar valores manualmente.
- Pruebas de regresión para prioridad, interrupción, restauración y ausencia de residuos visuales.
- Documentar qué habilidad o escena referencia cada clip.

**Criterio de salida:** un archivo generado por Studio puede añadirse al repositorio, superar validación y reproducirse en combate por su ID.

### Fase 6 — Persistencia y publicación

**Propósito:** guardar proyectos sin introducir credenciales ni acoplar el editor a un proveedor.

**Tareas:**

- Mantener descarga/subida de archivos como mecanismo universal.
- Guardado local recuperable y aviso de cambios sin exportar.
- Evaluar commits autenticados solo como integración opcional y fuera del cliente público.
- Versionar migraciones cuando aparezca `cronicas-studio/v2`.

**Criterio de salida:** los proyectos se recuperan y migran sin tokens almacenados en GitHub Pages ni pérdida silenciosa de datos.

## Riesgos
- La anatomía femenina no debe tratarse como equivalente solo por tener nombres de piezas similares.
- Un editor de poses no es automáticamente un editor de clips compatibles con el formato anterior.
- Ropa y accesorios pueden necesitar distintas profundidades durante un ataque.
- Guardado directo desde GitHub Pages requiere autenticación y permisos adecuados.
- Pixel art necesita filtrado nearest-neighbor y pivotes consistentes.
