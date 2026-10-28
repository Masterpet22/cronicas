# Estado actual del proyecto

Este documento es la referencia breve del alcance vigente de *Crónicas del Sello*. La campaña descrita aquí coincide con el código conectado mediante `STORY_SAGAS` y con [`saga-1-tutorial.md`](saga-1-tutorial.md).

## Versión y alcance

- Versión del paquete: `0.45.1`.
- Estado: prototipo jugable con la primera saga disponible y expansión futura planificada.
- Plataforma de juego habilitada: navegador en pantalla de escritorio.
- Las nueve localidades de la aldea permiten entrar desde el mapa desde el inicio. Tienda, Torre, Arena, Gremio y Eventos muestran sus pantallas y personajes; sus servicios futuros siguen en preparación.
- Guardado: tres partidas locales, esquema `SAVE_VERSION = 18`, progreso por paso y migración automática desde v16/v17, conservando las investigaciones como principales.
- Combate: duelos consecutivos uno contra uno, afinidades, estados, sellos, equipo, técnicas y progresión.
- Cada misión incluye dos reintentos del duelo perdido, con vida y chakra restaurados, estados y recargas limpios y los duelos previos conservados. Al agotarse se desactiva Reintentar; Retirada abandona la misión y descarta sus recompensas provisionales. Una misión abandonada vuelve a ofrecer Iniciar historia.
- Durante las misiones se oculta la barra de perfil, experiencia y monedas. Kagemori, las rutas del médico y el cifrado ofrecen un botón compacto de Pausa y la tecla Esc: reanudar, ajustes y abandono con confirmación. La pausa detiene las animaciones y las esperas de la vista, incluidos los diálogos pendientes; al volver a la aldea reaparece la barra habitual.
- El metajuego inicia sin descargar Phaser ni las escenas de combate. La primera misión carga ambos bajo demanda una sola vez; las entradas posteriores reutilizan los módulos y la instancia aparcada.
- La entrada solo precarga las dos fuentes críticas. Los fondos de aldea, viaje y combate se solicitan al entrar en su vista, con versiones compartidas para evitar descargas redundantes.
- El mapa de la aldea, los fondos del Cuartel General y Kagemori, los iconos de Golpe veloz y Guardia y los objetos Perrito y Marioneta usan las ilustraciones reemplazadas y optimizadas en WebP. La marioneta sustituye a la silla también en partidas anteriores. El proceso está documentado en [`../artifacts/asset-replacements/README.md`](../artifacts/asset-replacements/README.md).
- Biblioteca, Arena, Dojo, Gremio, Tablón, Tienda y Torre, junto con el bosque y la salida de la aldea, usan los nuevos fondos ilustrados de 1376 × 768. Las ramas frontales mantienen transparencia real y el parallax de los viajes; las versiones de caché se renuevan con el cambio visual.
- La Plaza de Eventos, el Paso del Crepúsculo y la Marisma de los Juncos también usan los fondos nuevos optimizados a WebP. Kagemori conserva únicamente su WebP activo; se eliminó el PNG antiguo sin referencias. El Santuario de la Luna sigue usando su fondo anterior.
- Los tintes sólidos usan la API de Phaser 4 y las operaciones de pausa, reanudación y cierre validan el estado de la escena. Cerrar una transición de subida de nivel cancela sus continuaciones y restaura el HUD.
- Los iconos accesibles del combate se recortan y tiñen una sola vez por variante. Una caché LRU ligada a Phaser los reutiliza entre misiones y se limpia al destruir la instancia.
- La misión 1 enseña el combate con una guía de 11 pasos, foco visual y práctica real. Se puede omitir y repetir desde la Biblioteca, disponible como manual desde el inicio; el bestiario sigue requiriendo el libro de Haru.
- La misión 3, Asalto al Desfiladero del Cuervo, continúa directamente del primer duelo al teniente. La fase de investigación de la cantera está retirada por el momento; se conserva la decisión sobre el prisionero tras el segundo duelo.
- El creador permite elegir peinado (sin cabello, corto o coleta) con vista previa y conserva la elección al cambiar de género. Incluye la sección de traje, pendiente de sus recursos gráficos. Las transiciones entre encuentros comparten la barra de recorrido de salida y regreso de misión.
- La vista previa del creador muestra partículas de la afinidad detrás del cuerpo: brasas, gotas, fragmentos de tierra o corrientes de viento. Con movimiento reducido se mantienen estáticas.
- Las misiones eligen ruta o transportación en `transitions`, por salida, regreso y encuentro de destino. La transportación sigue seis pasos y usa el objeto elegido en Dojo → Apariencia (tronco, perrito o marioneta). Consulta [`TRANSICIONES.md`](TRANSICIONES.md).
- Dojo → Técnicas separa la colección aprendida del equipo de combate. Muestra las cuatro ranuras (las adicionales se abren en niveles 5 y 8), permite reemplazar una equipada sin perder lo aprendido y mantiene las acciones del detalle dentro del panel.

## Contenido jugable vigente

La primera saga se llama **Futuro prometedor** y contiene siete misiones principales, todas en el **Cuartel General**:

1. `m01` — **Tras las huellas del gato**.
2. `s01` — **El silencio de Kagemori**.
3. `m02` — **Asalto al Desfiladero del Cuervo**.
4. `s02` — **El médico errante**.
5. `m03` — **El umbral de los cuervos**.
6. `m04` — **El corazón de la guarida**.
7. `m05` — **El jefe de los bandidos**.

El catálogo `MISSIONS` contiene exclusivamente estas siete misiones principales. Los IDs históricos `s01` y `s02` se conservan para mantener partidas, decisiones y rutas; ya no indican categoría secundaria. `SECONDARY_MISSIONS` está vacío: el Tablón queda reservado para futuros encargos opcionales.

El Cuartel y la crónica de la Biblioteca muestran solo misiones descubiertas: disponibles o completadas. Las futuras misiones y sagas no revelan títulos, destinos, recompensas ni fichas bloqueadas. Tras completar la búsqueda de Haru se entrega el libro a Sayo antes de desbloquear la entrada a la guarida.

## Sistemas de contenido

- `src/content/sagas/futuro-prometedor/` contiene cada misión, sus diálogos y datos particulares; `saga.js` define el orden y `content/index.js` registra catálogos.
- `src/mission-system.js` evalúa requisitos, estados, tableros, actividades y efectos declarativos, además de calcular los valores derivados del historial.
- `src/dialogues.js` conserva diálogos de NPC y resuelve las claves de misión agregadas desde `src/content/`.
- `src/save/save-migrations.js` migra versiones puramente; `campaign-state.js`, `character-state.js` y `slot-repository.js` dividen las responsabilidades del guardado.
- `src/battle/` contiene las escenas Phaser, el estado serializable de combate y los módulos puros de daño, turnos, enemigos y recompensas.
- Las tres arenas tienen perfiles visuales declarativos y un controlador con alternativas para Canvas, modo ligero y movimiento reducido; véase [`PERFILES_VISUALES_ARENAS.md`](PERFILES_VISUALES_ARENAS.md).
- `src/view-runtime.js` desmonta la vista anterior, aborta sus listeners y elimina overlays antes de montar otra.
- Al volver a una ubicación HTML, las escenas de Phaser se detienen y el bucle queda dormido; la instancia se reutiliza en la siguiente misión para conservar su caché sin ejecutar un canvas oculto en segundo plano.
- El framebuffer usa perfiles automáticos entre 1× y 2× según memoria y núcleos disponibles; el tamaño lógico permanece en 960×540 y el perfil queda registrado en las métricas.
- [`SISTEMA_MISIONES_DIALOGOS.md`](SISTEMA_MISIONES_DIALOGOS.md) es el contrato para añadir requisitos, mecánicas, efectos y traducciones sin condicionales por ID.

## Expansión futura

La [plantilla artística común](VALIDACION_PLANTILLA_ARTISTICA.md) tiene contrato candidato,
guía SVG y auditoría de seis combinaciones. La integridad geométrica activa pasa; la aprobación
del arte definitivo sigue pendiente por maestros/vestuario compatibles, registro de cuerpos
y orden de capas. La apariencia actual no se ha sustituido por la candidata.

La campaña crecerá mediante nuevas sagas y misiones después de estabilizar la primera. Los documentos [`HISTORIA_GENERAL.md`](HISTORIA_GENERAL.md) y [`PERSONAJES_Y_EVENTOS.md`](PERSONAJES_Y_EVENTOS.md) describen el relato y el reparto vigentes; no reservan capítulos ni personajes para expansiones todavía no aprobadas.

## Herramientas internas

El botón **PRUEBAS** y la pantalla `renderDebugTools` se conservan durante el desarrollo para preparar estados y entrar directamente a misiones. Son un bloqueador explícito de lanzamiento: deben eliminarse, junto con sus estilos y pruebas de presencia, antes de publicar la versión 1.0.

## Documentos normativos

- Alcance vigente: este documento.
- Diseño de la primera saga: [`saga-1-tutorial.md`](saga-1-tutorial.md).
- Plan de producción: [`../ROADMAP.md`](../ROADMAP.md).
- Arquitectura: [`INDICE_CODIGO.md`](INDICE_CODIGO.md).
- Plan de reparaciones de rendimiento y ciclo de vida: [`PLAN_REPARACIONES.md`](PLAN_REPARACIONES.md).
- Extensión de contenido: [`SISTEMA_MISIONES_DIALOGOS.md`](SISTEMA_MISIONES_DIALOGOS.md).
- Dirección visual: [`../ART_DIRECTION.md`](../ART_DIRECTION.md).
