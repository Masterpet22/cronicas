import { CHAKRA_BALANCE } from "../../../chakra-balance.js?v=1.0.0";

export const COMBAT_LESSONS = {
  basics: {
    intro: [
      { id: "welcome", title: "Tu primer combate, paso a paso", copy: "Practicarás sobre los controles reales: Golpe veloz, Guardia, kunai, shuriken y una técnica elemental. Las explicaciones detienen el tiempo; durante estas prácticas nadie cae." },
      { id: "health", target: "health", title: "Vida y costes de PV", copy: "Las barras rojas son los PV de ambos combatientes. A cero termina el duelo. Los ataques de taijutsu consumen PV; Golpe veloz, kunai y shuriken cuestan 0 PV." },
      { id: "chakra", target: "chakra", title: "Chakra y recuperación", copy: `Las técnicas elementales consumen CH. Al cerrar cada acción recuperas ${CHAKRA_BALANCE.turnRecovery} CH; Guardia recupera ${CHAKRA_BALANCE.guardRecovery} CH en total. El coste aparece en la ficha de cada movimiento.` },
      { id: "affinity", target: "health", title: "Qué aporta tu afinidad principal", copy: "Tu afinidad modifica atributos y concede una pasiva propia." },
      { id: "timeline", target: "timeline", title: "El 80 % es tu decisión", copy: "Al llegar al 80 %, eliges y el tiempo se detiene. Una acción inmediata sale entonces; las técnicas con sellos preparan del 80 al 100 %. Más sellos alargan la preparación y más velocidad la reduce." },
      { id: "enemy-turn", target: "timeline", title: "El rival también decide y prepara", copy: "El enemigo tiene su propio marcador: al 80 % elige una acción; si requiere sellos, prepara hasta el 100 %. Puede terminar antes que tú. Observa su preparación y sus sellos. Un nuevo rival comienza otro duelo; un jefe en fase II sigue dentro del mismo duelo. Lo comprobaremos durante esta misión." }
    ],
    actions: [
      { id: "strike", kind: "strike", title: "Ejecuta Golpe veloz", copy: "Usa el botón real 1. No cuesta PV ni CH. Su iniciativa +1 acelera un 10 % el recorrido de tu siguiente acción y no se acumula.", lesson: "strike" },
      { id: "guard", kind: "guard", title: "Prepara Guardia", copy: "Usa el botón 6. Reduce a la mitad el primer impacto y recupera chakra. Si el rival falla conservas la protección; mientras siga activa no puedes repetirla. Iniciativa −1: tu próximo recorrido tarda más.", lesson: "guard" },
      { id: "physical-table", kind: "table", table: "physical", title: "Abre la tabla física", copy: "Pulsa 0 o el control señalado para cambiar de tabla. El cambio no gasta tu acción. Golpe veloz y Guardia se mantienen en 1 y 6; las cuatro casillas centrales cambian." },
      { id: "weapon", kind: "weapon", title: "Ataca con tu kunai", copy: "Ejecuta Golpe de arma desde la tabla física. Solo está disponible si posees y llevas equipada un arma; su coste es 0 PV y 0 CH.", lesson: "weapon" },
      { id: "throwable", kind: "throwable", title: "Lanza el shuriken", copy: "Usa el shuriken de la tabla física. Es reutilizable: lanzarlo no gasta el objeto ni consume PV o CH. Sigue su estela hasta el blanco Normal.", lesson: "throwable" },
      { id: "elemental-table", kind: "table", table: "elemental", title: "Vuelve a las técnicas elementales", copy: "Pulsa 0 otra vez para recuperar tus técnicas equipadas. Tener una técnica aprendida y llevarla equipada son cosas distintas." },
      { id: "technique", kind: "technique", title: "Ejecuta una técnica elemental", copy: "Elige la técnica señalada: pagarás su coste real de chakra y recorrerás su preparación antes de los sellos.", lesson: "technique" }
    ], pause: true
  },
  resources: {
    intro: [{ id: "resources", title: "PV, objetos y decisiones", copy: "El acceso a la cantera te ha dejado un rasguño de práctica. Usa tu poción para recuperarte y después ejecuta el taijutsu que preparaste. Ambos son usos reales: los objetos gastados no regresan al retirarte ni al reintentar." }],
    actions: [
      { id: "potion", kind: "item", item: "health_potion", title: "Recupérate con una poción", copy: "Abre Objetos durante tu turno y usa Poción de vida. Solo se consume si recupera PV. Usar un consumible gasta la acción.", lesson: "potion" },
      { id: "physical-table", kind: "table", table: "physical", title: "Busca tu taijutsu", copy: "Cambia a la tabla física. El taijutsu preparado en T1 o T2 ocupa una casilla central." },
      { id: "taijutsu", kind: "taijutsu", title: "Prueba el coste de vida", copy: "Ejecuta el taijutsu equipado y observa tus PV. Su coste se paga antes del golpe; no puedes usarlo si te dejaría sin vida. Después decidirás el destino del teniente.", lesson: "taijutsu" }
    ]
  },
  tactics: {
    intro: [{ id: "tactics", title: "De la ficha a la estrategia", copy: "Has consultado el Bestiario y relacionado tu afinidad con sus ventajas. Ahora usa una técnica y prepara Guardia para comprobar cómo encajan en un combate real. Los datos desconocidos se completan observando al rival." }],
    actions: [
      { id: "elemental", kind: "technique", title: "Aplica tu técnica preparada", copy: "Ejecuta una técnica elemental. Mira el aro de afinidad del enemigo: Normal no tiene debilidad; contra un elemental se aplica el ciclo que acabas de practicar.", lesson: "elemental" },
      { id: "guard-tactics", kind: "guard", title: "Reserva recursos para el siguiente duelo", copy: "Prepara Guardia para recuperar chakra y reducir un impacto. Completa luego la entrada elegida sin depender de repetir una única técnica.", lesson: "guard-tactics" }
    ]
  },
  statuses: {
    intro: [{ id: "statuses", target: "statuses", title: "Reconoce y limpia un estado", copy: "El humo de las galerías ha provocado una quemadura leve de práctica. Bajo tus barras aparecen su duración y efecto. El daño periódico se resuelve al cerrar tus acciones; un purificador elimina el estado y Empapado." }],
    actions: [{ id: "cleanse", kind: "item", item: "purifying_tonic", title: "Usa el tónico purificador", copy: "Abre Objetos y usa Tónico purificador. Comprueba que desaparece la quemadura. Después practicarás una recuperación amplia y otra conservando suministros entre duelos.", lesson: "cleanse" }]
  },
  final: {
    intro: [{ id: "final", title: "Evaluación de Novicio", copy: "Demuestra tu preparación con una técnica elemental y una Guardia. Después vencerás a Raizen y responderás a su cambio de fase. Las decisiones de la cantera y los documentos siguen teniendo efecto. Terminar esta saga no concede el rango Experto." }],
    actions: [
      { id: "final-elemental", kind: "technique", title: "Abre con una técnica", copy: "Ejecuta una técnica de tu equipo: administra su chakra, preparación y enfriamiento.", lesson: "final-elemental" },
      { id: "final-guard", kind: "guard", title: "Demuestra tu defensa", copy: "Prepara Guardia y observa los avisos de sus ataques. Al finalizar estas dos prácticas, el duelo continúa con tus decisiones.", lesson: "final-guard" }
    ]
  }
};
