# Crónicas Studio — Diseño y plan de implementación

Estado: especificación v1, 2026-10-11. Rama: `feature/cronicas-animation-studio`.

## Objetivo
Construir un editor web gratuito, integrado con Crónicas, para calibrar personajes modulares, configurar esqueletos masculino/femenino, crear animaciones por fotogramas clave, asociar ropa y variantes de sprites, y exportar resultados reutilizables. El jugador configura el avatar; el desarrollador crea recursos y movimientos.

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
    "duration": 800,
    "loop": false,
    "keys": {
      "shoulderRight": [
        {"t": 0, "angle": 0},
        {"t": 240, "angle": -45},
        {"t": 800, "angle": 0}
      ]
    },
    "spriteEvents": [
      {"t": 180, "slot": "handRight", "variant": "grip"}
    ]
  }
}
```

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
6. Exportar JSON del proyecto; incorporar a la biblioteca del juego tras validar su esquema.

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
- Futuro: `src/animations/studio-format.js` (validación/importación); `skins.js` (resolución de slots); `anatomies.js` (pivotes y escala).

## Estado de implementación y fases
- **Fase 0 — análisis (realizada):** inspección de calibrador, rig, runtime y clips.
- **Fase 1 — prototipo de editor:** crear fotogramas clave de rotación, reproducir, editar duración, importar/exportar JSON, usar huesos existentes. Debe etiquetarse como **prototipo**, no integrado todavía con combates.
- **Fase 2 — compatibilidad real:** jerarquía/pivotes por anatomía, visualización precisa de sprites y corrección de proporciones.
- **Fase 3 — prendas y variantes:** asignaciones por ranura, selector de sprite en timeline, catálogo de ropa, sockets de arma.
- **Fase 4 — motor de juego:** lector de clips del editor, validación, pruebas de regresión y vista previa dentro de combate.
- **Fase 5 — guardado a repositorio:** exportación de archivos primero; commits autenticados opcionales, sin guardar tokens en una web pública.

## Criterios de aceptación de fase 1
- Editar claves separadas para un hueso en al menos dos tiempos.
- Reproducción determinista entre fotogramas clave y pausa.
- Importación/exportación JSON sin perder claves.
- La versión publicada del juego sigue intacta.
- Prototipo accesible desde navegador en la rama de trabajo.

## Riesgos
- La anatomía femenina no debe tratarse como equivalente solo por tener nombres de piezas similares.
- Un editor de poses no es automáticamente un editor de clips compatibles con el formato anterior.
- Ropa y accesorios pueden necesitar distintas profundidades durante un ataque.
- Guardado directo desde GitHub Pages requiere autenticación y permisos adecuados.
- Pixel art necesita filtrado nearest-neighbor y pivotes consistentes.
