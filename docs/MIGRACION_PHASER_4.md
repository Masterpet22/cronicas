# Migración de Phaser 3 a Phaser 4

Fecha: 25 de octubre de 2026  
Rama de trabajo: `migracion`  
Versión anterior: Phaser 3.90.0  
Versión instalada: Phaser 4.2.1

## Alcance

- Sustitución de la distribución local de Phaser 3.90.0 por Phaser 4.2.1.
- Adaptación de las APIs incompatibles utilizadas por el HUD de combate.
- Actualización de documentación y pruebas de regresión.
- Validación del arranque del juego, creación del canvas, entrada y salida del combate y finalización de una misión.

## Problemas encontrados y soluciones

### 1. API de tinte eliminada

**Problema:** Phaser 4 eliminó `setTintFill()`, utilizado por la silueta de la segunda fase de los jefes.

**Solución:** `applyFillTint()` centraliza `setTint()` junto con `setTintMode(Phaser.TintModes.FILL)`, preservando el efecto de relleno sólido e impidiendo que las transiciones recuperen la API retirada.

### 2. Sistema `postFX` eliminado

**Problema:** el desenfoque del panel de acciones dependía de `postFX.addBlur()`, que ya no existe en Phaser 4.

**Solución:** el efecto se migró a `enableFilters().filters.internal.addBlur()`. También se añadió una comprobación del renderer para omitir el filtro cuando el juego funciona mediante Canvas, ya que los filtros de Phaser 4 requieren WebGL.

### 3. Máscaras geométricas incompatibles con WebGL

**Problema:** `GeometryMask` permanece disponible únicamente para el renderer Canvas en Phaser 4. Las barras, retratos y marcadores del HUD utilizaban estas máscaras bajo WebGL.

**Solución:** se retiraron las máscaras redundantes. Las barras continúan contenidas por sus marcos gráficos y los retratos por sus marcos circulares, evitando filtros de máscara individuales y su coste de renderizado.

### 4. Pruebas acopladas a Phaser 3

**Problema:** las pruebas buscaban el archivo `phaser-3.90.0.min.js` y las llamadas a las APIs eliminadas.

**Solución:** se actualizaron las aserciones para Phaser 4.2.1, el nuevo sistema de filtros y el nuevo modo de tinte. El smoke test comprueba además `window.Phaser.VERSION` en ejecución.

### 5. Automatización de combate poco estable

**Problema:** el smoke test de misiones enviaba varias teclas consecutivas al canvas, lo que podía perder acciones durante transiciones de turno.

**Solución:** la automatización utiliza primero los controles HTML accesibles que reflejan el estado real de disponibilidad de las acciones y conserva el teclado como fallback.

## Verificación

- `npm test`: todas las pruebas unitarias y estructurales pasan.
- Smoke de navegador: Phaser 4.2.1 se carga, el canvas se crea y se aparca para reutilizarlo sin excepciones durante el ciclo de combate comprobado.
- Smoke de misión `m02`: la misión termina, persiste el progreso y no genera errores visibles del navegador.
- Búsqueda estática: no quedan referencias de aplicación a Phaser 3.90.0, `setTintFill`, `postFX` ni máscaras geométricas.
- `git diff --check`: sin errores de espacios o formato del parche.

## Archivos de runtime

- Añadido: `assets/vendor/phaser-4.2.1.min.js`.
- Eliminado: `assets/vendor/phaser-3.90.0.min.js`.

