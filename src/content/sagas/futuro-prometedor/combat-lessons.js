export const COMBAT_LESSONS = {
  basics: {
    intro: [
      { id: "welcome", target: "health", title: "Protege tu vida", copy: "Estoy aquí, a tu lado. Mira tu barra de vida, marcada con PV: si se agota, pierdes el duelo. Primero probaremos un golpe y una defensa. No dejaré que ninguno caiga mientras practicamos." },
      { id: "timeline", target: "timeline", title: "Espera tu turno y elige", copy: "Tu marcador avanza por la barra inferior. Al llegar al 80 %, el combate se detiene para que elijas con calma. El rival tiene su propio marcador. Ahora espera tu primer turno." }
    ],
    actions: [
      { id: "strike", kind: "strike", title: "Ejecuta Golpe veloz", copy: "Empieza con Golpe veloz, en el 1. No gastarás vida ni chakra. Mira cuánto baja la vida del rival después de golpear.", lesson: "strike" },
      { id: "guard", kind: "guard", title: "Prepara Guardia", copy: "Ahora protégete con Guardia, en el 6. Reducirás a la mitad el próximo impacto y recuperarás chakra. El escudo seguirá contigo hasta que te alcancen.", lesson: "guard" },
      { id: "physical-table", kind: "table", table: "physical", title: "Abre la tabla física", copy: "Pulsa 0 o el control señalado para cambiar de tabla. El cambio no gasta tu acción. Golpe veloz y Guardia se mantienen en 1 y 6; las cuatro casillas centrales cambian." },
      { id: "weapon", kind: "weapon", title: "Ataca con tu kunai", copy: "Ejecuta Golpe de arma desde la tabla física. Solo está disponible si posees y llevas equipada un arma; su coste es 0 PV y 0 CH.", lesson: "weapon" },
      { id: "throwable", kind: "throwable", title: "Lanza el shuriken", copy: "Usa el shuriken de la tabla física. Es reutilizable: lanzarlo no gasta el objeto ni consume PV o CH. Sigue su estela hasta el blanco Normal.", lesson: "throwable" },
      { id: "elemental-table", kind: "table", table: "elemental", title: "Vuelve a las técnicas elementales", copy: "Pulsa 0 otra vez para recuperar tus técnicas equipadas. Tener una técnica aprendida y llevarla equipada son cosas distintas." },
      { id: "technique", kind: "technique", title: "Ejecuta una técnica elemental", copy: "La barra CH es tu chakra. La técnica señalada gasta la cantidad indicada en su botón. Púlsala y observa cómo baja CH; después prepararás sus sellos.", lesson: "technique" }
    ]
  },
  resources: {
    intro: [{ id: "resources", title: "PV, objetos y decisiones", copy: "Al cruzar las rocas de la entrada te has hecho un rasguño. Mira los PV que te faltan: usa la poción que trajiste. Después probarás el taijutsu que aprendiste en el Dojo." }],
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
    intro: [{ id: "statuses", target: "statuses", title: "Reconoce y limpia un estado", copy: "El humo de las galerías te ha causado una quemadura leve. El icono bajo tus barras indica que perderás vida al terminar tus acciones. Usa el purificador que trajiste para eliminarla." }],
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
