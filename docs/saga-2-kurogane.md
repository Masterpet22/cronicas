# Saga 2 — Los hermanos Kurogane

Estado: integrada en la campaña jugable, tras **Futuro prometedor**. La propuesta aportada por el usuario se aprobó para implementación. El pasado y las motivaciones de los antagonistas permanecen reservados para futuras secundarias. El apellido compartido con Raizen no establece un parentesco nuevo.

## Entrada y prólogo

Tras completar las siete misiones de la primera saga, el Cuartel permite abrir la segunda. Antes de su primera misión invita a visitar el Gremio. La habitación nueva comienza vacía. Una conversación del maestro presenta el bonsái del aprendiz y la insignia de novicio; solo al pulsar «Recibir los recuerdos» quedan disponibles. Se entrega como máximo la unidad que falta, sin sumar copias a las existentes. Yuna enseña a colocarlos y ofrece «Ir al Cuartel» cuando ambos están en la habitación. Las partidas anteriores conservan sus objetos y sus posiciones: si ya están colocados, se reconocen sin exigir moverlos o repetir prácticas. Mientras el prólogo esté pendiente, no se permite vender el último ejemplar de cada regalo.

Al regresar a la aldea después de confirmar el informe de Raizen, el maestro elegido ofrece su consejo de cierre, anuncia el fin de **Futuro prometedor** y Ren presenta los nuevos accesos. «Ir al Gremio» lleva directamente al prólogo. Las partidas anteriores que ya completaron la saga y aún no iniciaron la segunda reciben la misma conversación. Se registra como leída solo al terminar; no se repite tras recargar. El mapa mantiene el objetivo del Gremio hasta completar la decoración y, al volver al Cuartel, abre directamente **Los hermanos Kurogane**.

El prólogo no es una sexta misión ni entrega PX. Sus regalos y prácticas se conservan al recargar. Tras completar la decoración, el jugador confirma la convocatoria y vuelve al Cuartel.

Yuna da las instrucciones desde su bocadillo en la escena del Gremio, también al volver a hablar con ella. Su guía refleja los regalos pendientes y el progreso guardado; cuando ambos están preparados, ofrece «Ir al Cuartel». La habitación no contiene un panel de tutorial ni un bloque de instrucciones que añada desplazamiento al editor.

## Compañeros

Antes de partir se presentan Haruto Kazehara y Akari Mizunose. El equipo queda fijado durante las cinco misiones; solo se puede cambiar después de completar la saga, en Dojo → Equipo → Compañero de equipo. Este selector es independiente del espacio de inventario para invocaciones.

| Compañero | Afinidad | Decisión CPU |
| --- | --- | --- |
| Haruto | Viento | Ataca al rival vivo con menos PV. Usa Corte de Vendaval si dispone de 14 CH; en caso contrario, Golpe veloz. |
| Akari | Agua | Con 16 CH, prioriza Barrera de Agua si el protagonista está por debajo del 55 % de vida o la carga del 75 % de integridad. En otro caso ataca con Pulso de Agua si dispone de 14 CH o usa Golpe veloz. |

Cada compañero tiene reloj, preparación, vida, chakra y estados propios. Las técnicas elementales y la barrera muestran los sellos reales y el gesto de manos del compañero en una secuencia automática, incluso con sellos manuales activados para el protagonista. Sus ataques pasan por el cálculo compartido de daño, precisión, afinidades, guardia y reacciones; los estados se aplican al participante real. Una barrera de Akari reduce a la mitad el siguiente daño al protagonista y recupera 18 puntos de integridad de la carga. Las acciones recuperan 5 CH. Si el compañero cae, deja de actuar; el protagonista puede terminar solo. La caída del protagonista implica derrota.

Ambos personajes siguen apareciendo en los briefings, con aportaciones distintas del compañero no seleccionado. Las reacciones del seleccionado avanzan con las misiones sin dividir la campaña en dos rutas.

## Cinco misiones

La numeración de la campaña continúa de 8 a 12; los IDs son exclusivos de esta saga.

| ID | Misión | Encuentro |
| --- | --- | --- |
| `k01` | Huellas en el camino | Dos aliados contra explorador y asaltante. Una nota señala el campamento. |
| `k02` | El campamento oculto | Dos aliados contra tres enemigos. Los registros apuntan a órdenes externas. |
| `k03` | La carga prohibida | Tres enemigos y documentos con 100 puntos de integridad. Se confirma la relación con Cuervo Negro. |
| `k04` | La sombra del hermano menor | Tatsu y dos secuaces. Renji lo rescata; su retirada revela el santuario. |
| `k05` | El juramento de los Kurogane | Primera oleada de tres bandidos; segunda de Renji y Tatsu. Los hermanos sobreviven y quedan capturados. |

La tercera misión pierde al llegar a cero la integridad. Cada tercera acción enemiga ofensiva se dirige a los documentos, con 12 de daño; Guardia cubre el siguiente ataque a la carga y lo reduce a 6. Eliminar el grupo asegura los documentos que quedan. Parte de los folios ya está quemada al llegar, por lo que proteger con éxito no contradice la recuperación parcial del informe.

En el santuario se conservan vida, chakra y consumibles entre oleadas. Con ambos hermanos vivos, la Guardia de Renji cubre también a Tatsu. Un impacto contra Renji equivalente al menos al 18 % de su vida máxima prepara la siguiente respuesta ofensiva de Tatsu con 8 puntos adicionales de daño base. Aliento de brasa alcanza también al otro aliado. Neutralizar a un hermano rompe la cooperación.

## Posiciones, recursos y guardado

- Se reutilizan los anclajes de `COMBAT_SLOTS`, con posiciones reservadas para protagonista, compañero, mascota futura y objetivos. La selección usa la identidad del objetivo, sin mover combatientes ni reiniciar sus relojes.
- Clic, toque y botones accesibles con Tab/Enter seleccionan rivales. La elección se bloquea al preparar o ejecutar una acción. Cambiar de objetivo sincroniza sus barras y conserva las animaciones de daño vinculadas a la entidad correspondiente.
- La saga 1 conserva sus duelos. El Dojo conserva sus grupos de práctica sin recompensas ni escrituras de campaña.
- Se reutilizan pausa, consumibles, regreso a la aldea y confirmación de resultados. La misión se paga una sola vez y solo se completa tras derrotar todos sus grupos. Las recompensas se confirman con la transacción de victoria habitual.
- Hay dos reintentos gratuitos por misión y luego pergaminos. El reintento restaura protagonista, compañero, rivales y objetivo de la oleada perdida, limpia estados y recargas y conserva las oleadas superadas. No devuelve consumibles.
- La retirada descarta las recompensas y la victoria provisional. Volver a iniciar la misión comienza sus grupos desde el principio; las prácticas del prólogo y el compañero elegido persisten.
- Los nuevos campos se normalizan en el esquema 29; las partidas existentes reciben sus valores predeterminados sin perder progreso ni decoración.

## Cierre

Renji describe una operación regional de Cuervo Negro, sin identificar a sus dirigentes. Los documentos contienen un símbolo distinto y parcialmente borrado; la reacción del maestro abre el misterio del siguiente arco. Completar esta saga conserva el rango actual, habilita cambiar de compañero y satisface el requisito de historia para la Arena, que además exige nivel 16. No se añaden misiones de saga 3.

## Verificación

`tests/kurogane.test.mjs` comprueba requisitos, decoración real, regalos únicos, elección fija, normalización, CPU, progreso y desbloqueos. `tests/kurogane.spec.mjs` recorre el prólogo y la selección en tablet, los grupos de campaña, ataques de ambos bandos, protección de carga, oleadas, recompensas y reintentos con consumibles gastados. La batería general conserva una instantánea independiente del comportamiento de los duelos de saga 1.
