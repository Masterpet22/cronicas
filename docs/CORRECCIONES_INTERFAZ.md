# Correcciones de interfaz

Esta pasada conserva escenarios, guardianes, paleta, árbol de Resonancia, reglas y progresión. Parte del análisis de interfaz del 6 de noviembre de 2026 y del commit remoto `295fe5d`, que incorpora rostros y tonos de piel.

- **Técnicas:** ficha seleccionada con espacio propio y métricas visibles; mover el cursor no sustituye la selección. Equipo de combate desplegable, textos funcionales de al menos 12/13 px y cuerpo de lectura de 14 px. La vista inicial muestra las habilidades aprendidas, disponibles y el progreso cercano de las afinidades actuales. «Mostrar árbol completo» conserva acceso a las 38 habilidades sin cambiar sus requisitos. Los tutoriales pueden revelar controles dentro del desplegable.
- **Personaje:** atuendo de entrenamiento terminado para ambos rigs, compartido por creador, Dojo y combate. El rostro, cabello, piel y animaciones existentes se mantienen. Las prendas futuras se identifican como gráficos pendientes y explican que conservan la representación base; no se inventan sus variantes. Procedencia y prompt en `assets/modular/outfits/training/README.md`.
- **Modales:** Equipo y Maestro usan diálogos nativos con aislamiento del fondo, recorrido de foco, Escape y vuelta al control de apertura.
- **Guardado:** los fallos de escritura y eliminación mantienen un estado por ranura en memoria. El aviso global ofrece reintento y copias JSON, y advierte antes de cerrar con operaciones pendientes. No se sobrescribe otra ranura si falla la selección del almacenamiento.
- **Carga de módulos:** las dependencias que consumen el estado de guardado comparten una versión de módulo. Sus importadores también renuevan su versión para que la caché no mantenga consumidores anteriores al actualizar la interfaz.
- **Ayuda:** en la ruta de Haru y el cifrado, el consejo ocupa una zona propia dentro del flujo, en lugar de tapar las instrucciones.
- **Navegación:** los destinos abiertos del mapa tienen nombres persistentes; la tienda usa un selector de categorías agrupadas y restaura el foco tras filtrar o comprar.
- **Contenido futuro:** Clanes y la clasificación de Arena presentan detalles desplegables. Las herramientas de pruebas solo se muestran en orígenes locales de desarrollo.
- **Combate y eventos:** las etiquetas de la línea de turnos usan su ancho real para evitar colisiones; los rótulos del calendario aumentan de tamaño.
- **Pantallas pequeñas:** el aviso táctil explica el modo compacto disponible. El criterio de puntero evita tratar una ventana de escritorio estrecha o ampliada como un teléfono.

## Comprobación

```powershell
npm test
npm run smoke:interface
```

Las regresiones nuevas están en `tests/save-recovery.test.mjs` y `tests/interface-corrections.spec.mjs`. Comprueban memoria y reintentos por ranura, borrado pendiente, confinamiento del foco, Escape, acceso al árbol completo, lectura a 1280×720 y 1440×900, separación de ropa y piel, integridad alfa de las piezas, descarga de respaldo y entrada compacta táctil.

Las capturas y los registros de ejecución se guardan en `artifacts/correcciones/` y `test-results/`. Las verificaciones de navegador utilizan contextos efímeros y partidas de pruebas.

Resultado de esta pasada: suite unitaria completa superada; 102 casos de interfaz verificados, con reejecución de los fallos y una comprobación final adicional de diez casos. Las capturas de las pantallas afectadas no registraron errores de página. Las catorce piezas del atuendo se regeneraron desde el atlas y sus hashes coincidieron con las exportaciones entregadas.

El detector de diseño se ejecutó una vez sobre la interfaz final. Se retiró después el rótulo móvil diminuto y se redujo el espaciado del aviso. Sus demás señales son advertencias estéticas sobre brillos, contenedores y texturas del estilo existente; no equivalen a una certificación de accesibilidad.
