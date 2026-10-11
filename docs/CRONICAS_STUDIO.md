# Crónicas Studio — Diseño y plan de implementación

Estado: plan de implementación v2, 2026-10-11. Fase 1 completada en `main`.

## Objetivo
Construir un editor web gratuito, integrado con Crónicas, para calibrar personajes modulares, configurar esqueletos masculino/femenino, crear animaciones por fotogramas clave, asociar ropa y variantes de sprites, y exportar resultados reutilizables. El jugador configura el avatar; el desarrollador crea recursos y movimientos.

El resultado principal del Studio no es una captura ni una animación aislada: es un archivo versionado que el juego puede validar, previsualizar y, tras su aprobación, incorporar a su biblioteca sin copiar valores manualmente.

## Estado observado y brecha de integración

- El prototipo ya crea claves de rotación, reproduce, pausa e importa/exporta `cronicas-studio/v1`.
- El juego usa `PUPPET_ANIMATION_CLIPS`, cuyas pistas contienen `target`, `from`, `to`, `duration`, `delay`, `ease` y `yoyo`.
- El JSON inicial del Studio solo describía secuencias `{t, angle}` y no incluía los metadatos necesarios para el catálogo.
- Exportar un archivo desde el navegador todavía no equivale a instalarlo en el juego. Primero debe superar validación estructural, compatibilidad de rig y comparación visual entre Studio y Phaser.
- La interfaz objetivo puede construirse sobre este flujo, pero ningún control debe guardar información que el esquema o el runtime no comprendan.

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

## Arquitectura recomendada
- `puppet-calibrator.html`: conservar como herramienta de calibración.
- `animation-studio.html`: interfaz de edición; MVP en rama.
- `src/animations/rig.js`: base de jerarquía ya existente.
- `src/animations/runtime.js`: runtime actual de clips; ampliar para nuevas pistas de fotogramas clave.
- `src/animations/clips.js`: catálogo de movimientos existentes.
- `src/animations/studio-format.js`: contrato, normalización, validación e importación/exportación determinista.
- `src/animations/studio-runtime.js`: muestreo del proyecto editable con las mismas propiedades y curvas nominales del juego.
- Futuro: `studio-adapter.js` (compatibilidad con catálogo/runtime), `skins.js` (resolución de slots) y `anatomies.js` (pivotes y escala).

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

### Fase 2 — Paridad de runtime y adaptador del juego

**Propósito:** lograr que Studio y Phaser produzcan la misma pose para el mismo archivo y tiempo.

**Tareas:**

- Definir un lector directo de fotogramas clave o un adaptador sin pérdida; no convertir secuencias complejas en un único tween.
- Mantener los clips heredados de `clips.js` mediante una capa de compatibilidad durante la migración.
- Resolver propiedades concurrentes por objetivo sin crear tweens que compitan entre sí.
- Aplicar prioridad de estados, restauración de pose y bucles igual que el controlador actual.
- Crear una prueba de paridad que muestree inicio, puntos intermedios, claves y final en ambos runtimes.
- Añadir una vista de combate de prueba que cargue un archivo exportado como borrador.

**Criterio de salida:** diferencia cero en propiedades numéricas entre la previsualización del Studio y el adaptador de Phaser para un conjunto representativo de clips.

### Fase 3 — Interfaz de autor alineada con la guía visual

**Propósito:** reconstruir la experiencia del editor sobre el contrato ya estable.

**Tareas:**

- Ajustar escala y proporciones del lienzo; el personaje debe verse completo a un zoom coherente.
- Navegación superior por Animador, Calibrador, Sprites, Exportar y Proyecto.
- Árbol jerárquico con visibilidad y bloqueo sin duplicar la jerarquía de `rig.js`.
- Inspector de transformaciones relativas, no de posiciones de calibración.
- Timeline con regla, pistas, claves, eventos, FPS de visualización y zoom temporal.
- Vista fantasma, miniatura de previsualización y curvas nominales.
- Deshacer/rehacer mediante comandos serializables.

**Criterio de salida:** todas las operaciones visibles de la primera versión de la guía modifican campos definidos por el esquema o son controles puramente visuales.

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
