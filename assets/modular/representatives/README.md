# Representantes del mapa

Las doce figuras de escena se ensamblan con los maniquíes masculino y femenino del jugador. Se reutilizan sus pivotes, rostros, tonos de piel, manos, pantalones y botas. Los torsos, el vestuario de los brazos, los peinados y las barbas se adaptaron de las ilustraciones originales de `assets/npcs` con la herramienta integrada ImageGen. Los torsos cubren el arranque de ambos muslos.

Las escenas usan exportaciones WebP RGBA de 480 × 800. Se regeneran con `python scripts/pack-npc-puppets.py` desde las hojas de origen y las piezas del maniquí. El script usa Node.js y los paquetes de Python Pillow, NumPy y OpenCV.

Los torsos y brazos conservan el canal alfa de sus piezas de juego. Las hojas aportan el color, la tela y los accesorios interiores. La posición del cuello sale del maniquí y cada faja se alinea a la altura correspondiente entre el pecho y la cadera. Los puños y las manos comparten el pivote de la muñeca original. Las dos piernas se dibujan antes del torso. La escala y la línea del suelo son fijas y no dependen de la altura del pelo.

Cada corte se ajusta a la frente y a la sien de su cráneo. Los mechones posteriores se dibujan detrás de la oreja y el hombro. El calzado usa pares del guardarropa del juego, con el centro de cada caña alineado a su tobillo.

## Instrucciones de arte utilizadas

- Usar una plantilla de seis columnas y cuatro filas. Por fila, conservar torso, brazo izquierdo, brazo derecho, antebrazo izquierdo, antebrazo derecho y pelo. Mantener la orientación de tres cuartos hacia la derecha, las uniones y la escala de las piezas. El bajo del torso cubre ambos muslos. Exportar con transparencia y sin manos, rostros ni utilería.
- Cuartel, Dojo y Biblioteca. Ren lleva marfil y azul con emblema solar y pelo castaño en punta. Daichi lleva carbón y carmesí con pelo plateado. Mei lleva marfil y verde azulado con pelo corto oscuro. Sayo lleva índigo y violeta con un recogido alto y cinta.
- Tienda, Gremio, Torre y Arena. Hana conserva el pelo cobrizo y el cinturón de bolsillos. Yuna lleva crema, verde y dorado, con una trenza lateral. Kureha lleva carbón y ciruela, con coleta alta. Goro lleva chaleco rojo óxido, vendas y pelo negro corto.
- Tablón, Plaza y Kagemori. Riku conserva la bufanda verde y el pelo rubio. Nao lleva abrigo rojo y azul noche con bordados y cintas. Iori lleva manto castaño gastado y pelo largo gris. Nami lleva chaqueta oliva y faja rojiza.
- Las barbas de Daichi e Iori se dibujaron como capas independientes registradas a la mandíbula del maniquí masculino. Daichi conserva el bigote y la perilla corta. Iori lleva una barba canosa más llena.
