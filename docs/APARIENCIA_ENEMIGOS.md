# Apariencia de enemigos

Las identidades visuales se declaran en `src/enemy-appearance.js` y se asignan a los 17 perfiles de `ENEMY_ROSTER`. Cada perfil fija cuerpo, tono de piel, peinado y rostro. Las copias de Arena y Dojo conservan esos datos; cambiar de objetivo no vuelve a sortearlos.

La tropa bandida comparte tela oliva y cuero cálido. Las unidades del Cuervo usan tonos ciruela y cuero apagado. La tropa Kurogane viste granate con correajes claros. Junco, piedra, ceniza y veneno tienen sus propias paletas de rol. Estas etiquetas agrupan el vestuario existente; no introducen historia ni organizaciones nuevas.

Los cinco jefes llevan una base de armadura laminada distinta del chaleco de tropa. Varek, Akumori, Raizen, Renji y Tatsu tienen combinaciones de cuerpo, piel, cabello, rostro y paleta propias. La apariencia no modifica estadísticas, afinidades, patrones, costes ni recompensas.

Las fuentes y los prompts de ImageGen están en `assets/modular/outfits/factions/README.md`. Los cuatro atlas exportados contienen las siete piezas de ropa de cada cuerpo con sus dimensiones originales. El vestuario se compone sobre una copia del atlas teñido de piel; no se modifica el atlas compartido ni el atuendo de entrenamiento del jugador.

El cuerpo, el retrato principal, las tarjetas secundarias y cada marcador de iniciativa resuelven la misma apariencia. Al cambiar de objetivo o de encuentro también cambian el rostro y el cabello del retrato. Cada rival de un grupo conserva su marcador individual.

Comprobaciones:

```
node tests/enemy-appearance.test.mjs
node scripts/import-enemy-outfits.mjs
node scripts/verify-enemy-appearance.mjs
node scripts/verify-combat-hud.mjs --group
```

La lámina `artifacts/enemy-appearance/roster-webgl.png` usa los combatientes reales del juego, con sus texturas y rig, renderizados en WebGL.
