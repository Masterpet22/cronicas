# Revisión detallada contra la guía visual

La revisión conserva la perspectiva trapezoidal aprobada del menú y la orientación
hacia la derecha de ambos retratos de iniciativa. El fondo, el encuadre y los
combatientes conservan su implementación original.

| Elemento | Diferencia detectada | Ajuste integrado |
| --- | --- | --- |
| HUD superior | Rectángulos redondeados con adornos genéricos | Contorno escalonado bajo el retrato, versión reflejada del enemigo, líneas dobles y volutas curvas |
| Retratos | Remate circular sin las pequeñas aletas exteriores | Aletas en granate/dorado, conservando cabeza, pelo y marcos originales |
| Vida | Corazón de contorno y verde desaturado con franjas | Corazón relleno con brillo, verde más intenso y lustre continuo que acompaña el valor real |
| Chakra | Icono esquemático de gotas | Espiral azul con reflejo, barra azul más saturada y brillo proporcional al recurso |
| Insignias de nivel | Placas rectangulares planas | Esquinas redondeadas, fondo granate, filete dorado y luz superior |
| Placa central | Cápsula genérica | Extremos con punta y motivos de nube, doble contorno dorado y granate oscuro |
| Pausa | Símbolo de contorno y borde dorado | Dos barras rellenas en cian y contorno azul claro como en la guía |
| Habilidades | Aros pequeños, placas de coste estrechas y selección tenue | Aros mayores y concéntricos, números más legibles, placas redondeadas y flecha dorada en la selección real |
| Marcos de habilidades | Las reglas globales del canvas agrandaban el arte interior | Regla específica para encuadrar el icono dentro del aro, con prueba de geometría |
| Coste y enfriamiento | El texto de enfriamiento podía ensanchar la placa de coste | Coste numérico en su placa; CD o falta de chakra en un indicador propio sobre el icono |
| Iniciativa | Contenedor de extremos redondos y pista sin remate izquierdo | Marco de extremos biselados, remate de nube/espiral, flecha con entrante y hitos con pequeñas puntas |
| Retratos inferiores | El pelo sobresalía del círculo | Máscaras circulares que se desplazan con los retratos, también al reiniciar la iniciativa |
| Nombres inferiores | Rectángulos básicos | Placas negras con esquinas biseladas y filete dorado |

Las medidas de referencia se compararon en el lienzo lógico 960×540: paneles
superiores alrededor de Y=12–106, menú desde Y≈112 hasta Y≈524, placa central
en Y=17–45 e iniciativa en Y=453–526. La escala del escenario no se modifica.

Los detalles vectoriales se reúnen en `src/battle/hud-chrome.js`; Canvas y el
menú DOM comparten las mismas volutas. No se agregaron dependencias ni texturas
ilustradas nuevas. Los iconos de técnicas siguen usando sus imágenes y tintes
existentes; los números y estados proceden del motor.

La guía muestra nombres de técnicas, niveles, recursos y posiciones de iniciativa
ilustrativos. En el juego se conservan las habilidades reales, los desbloqueos de
ranuras NV 5/NV 8, el chakra enemigo 21/21 en la partida de prueba y las ranuras de
estados vacías cuando no hay estados activos. No se rellenan esferas ni se cambian
posiciones de iniciativa para imitar un estado ficticio.

## Evidencia reproducible

- `npm test`: suites de lógica, snapshots, arquitectura, guardados, recursos e interfaz.
- `node scripts/verify-combat-hud.mjs`: capturas en cinco resoluciones y pruebas
  de ratón, teclado, pausa, recursos, estados, cooldowns, máscaras y desbordamientos.
- Se compararon por contenido los métodos de escenario, creación de combatientes
  y avance de iniciativa con Git: permanecen iguales.

Capturas:

- Antes: `artifacts/combat-hud/before-detail-refinement.png`.
- Después: `artifacts/combat-hud/combat-1600x900.png`.
- Resoluciones adicionales y resultados: `artifacts/combat-hud/`.
