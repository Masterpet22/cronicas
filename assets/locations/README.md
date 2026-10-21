# Fondos de ubicaciones

Estos nueve fondos se usan en las escenas interactivas de la Aldea del Horizonte.

- `archive.webp` fue proporcionado por el usuario como **Biblioteca Mística Bajo la Luna.png** y optimizado para la web.
- `headquarters.webp`, `dojo.webp`, `shop.webp`, `tower.webp`, `arena.webp`, `inn.webp`, `missions.webp` y `event.webp` fueron generados con la herramienta integrada de generación de imágenes de Codex el 6 de octubre de 2026 y optimizados para la web.

## Dirección de los prompts

Se utilizó como referencia visual la biblioteca aportada por el usuario y el mapa `assets/village/aldea.webp`. Los ocho prompts pidieron escenarios panorámicos 16:9, estilo anime fantástico pintado, noche azul-violeta con luces cálidas, sin personajes, texto ni interfaz y con espacio de composición para un NPC a la izquierda y opciones a la derecha. Cada variante describió la arquitectura y utilería propias del Cuartel, Dojo, Tienda, Torre, Arena, Posada, Tablón de Misiones o Plaza de Eventos.

Los archivos originales generados se conservaron en el directorio de resultados de Codex y se copiaron aquí sin eliminar las fuentes.

## Camino de salida de la aldea

- `village-outskirts.webp` (1672×941): camino panorámico que atraviesa la puerta exterior de la Aldea del Horizonte, generado para los viajes de ida y regreso de las misiones.
- `village-outskirts-branches.webp` (1672×940, alfa): ramas de pino y arce cercanas a cámara, aisladas sobre transparencia real para el parallax horizontal.

Ambos recursos fueron generados con OpenAI ImageGen el 21 de octubre de 2026 y optimizados a WebP. El prompt del fondo pidió una salida de aldea japonesa fantástica al atardecer, con camino horizontal despejado, puerta, faroles, empalizada, montañas y bosque, sin personajes ni elementos de combate. El prompt frontal pidió ramas asimétricas de pino y arce sobre transparencia real, con el centro y la zona del corredor despejados.

## Camino del bosque

- `forest-road.webp` (1672×941): tramo de sendero dentro de un bosque montañoso, usado como segunda fase visual del viaje después de abandonar la aldea y como primera fase del regreso.

El recurso fue generado con la herramienta integrada OpenAI ImageGen el 21 de octubre de 2026 y optimizado a WebP. El prompt pidió una ilustración panorámica 16:9 de estilo anime/JRPG pintado, con un camino lateral despejado, pinos en varias capas, montañas con niebla y luz cálida de atardecer sobre una paleta fría; sin personajes, edificios, texto, interfaz ni ramas pegadas a cámara. Las ramas transparentes del camino de la aldea se reutilizan encima para conservar el parallax horizontal tanto al salir o regresar a la aldea como al avanzar de un combate al siguiente.
