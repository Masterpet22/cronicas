# Atuendo de entrenamiento

Atuendo inicial compartido entre el creador, Apariencia del Dojo y las marionetas de combate de ambos cuerpos. No modifica estadísticas ni las elecciones guardadas. Las prendas cuyo arte sigue pendiente conservan esta representación y lo indican en la interfaz.

Las catorce piezas mantienen las dimensiones de los sprites originales y usan los mismos anclajes de `src/character-rigs.js`. La piel, el rostro y el cabello conservan sus texturas y filtros independientes. La ropa no se vuelve a teñir al cambiar el tono de piel.

## Procedencia

Creado el 6 de noviembre de 2026 mediante la herramienta integrada **image_gen**, editando una hoja de referencia construida con los siete segmentos de torso, muslos, piernas y pies de cada rig existente. El atlas generado se conserva en `source/atlas.png`; `source/layout.json` identifica sus celdas y las dimensiones originales.

Prompt de producción:

> Edit the exact technical 4×4 sprite atlas into a neutral starter training outfit for a hand-painted 2D ninja RPG. Preserve canvas, cell positions, centers, scale, orientation, silhouette boundaries and attachment cuts. Top two rows: male torso, left thigh, left shin, left foot, right thigh, right shin, right foot, empty. Bottom two rows: corresponding female pieces and an empty cell. Dress both torsos in a modest sleeveless ink navy cloth tunic covering chest and pelvis, subtle fabric folds, muted brown belt, stitching and small V collar. Matching navy trousers, pale linen shin wraps and closed dark brown training shoes. Preserve joint ends and original outlines. No anatomical muscles painted on cloth, no heads, arms, hands, symbols, text, frames or outside shadows. Transparent background.

Las únicas operaciones posteriores son recorte por celda, ajuste del rectángulo alfa y normalización a las dimensiones del segmento. No se redibujaron las piezas por código.

Para regenerar las exportaciones desde el atlas:

```powershell
node scripts/import-training-outfit.mjs
```
