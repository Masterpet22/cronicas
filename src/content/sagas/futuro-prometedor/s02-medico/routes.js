export const DOCTOR_ROUTE_DEFINITIONS = Object.freeze({
  elevated: Object.freeze({
    id: "elevated", title: "Camino elevado", subtitle: "Seguro · lento",
    description: "La altura permite anticipar peligros, aunque obliga a rodear los barrancos.",
    outcomes: Object.freeze([
      { danger: 0, time: 2, clues: 1, resources: 0, text: "Desde la cornisa distingues humo al norte. Un arriero aconseja no confundir rapidez con progreso." },
      { danger: 0, time: 2, clues: 1, resources: 0, text: "Las marcas de rueda continúan por un paso largo, pero libre de emboscadas." },
      { danger: 0, time: 2, clues: 1, resources: 0, text: "Un mojón médico confirma que Haru cruzó esta ruta. El rodeo te deja cerca de su campamento." }
    ])
  }),
  river: Object.freeze({
    id: "river", title: "Sendero del río", subtitle: "Investigación · pistas",
    description: "Hay que leer la corriente y encontrar un paso seguro antes de avanzar.",
    passages: Object.freeze([
      Object.freeze({ correct: "stones", hint: "Las piedras con musgo roto soportaron peso recientemente." }),
      Object.freeze({ correct: "reeds", hint: "Los juncos inclinados señalan una corriente menos profunda." }),
      Object.freeze({ correct: "ford", hint: "Las huellas desaparecen frente a un vado oculto por grava." })
    ]),
    outcomes: Object.freeze([
      { danger: 0, time: 1, clues: 2, resources: 1, text: "Encuentras el primer cruce y recuperas vendas atrapadas entre las piedras." },
      { danger: 0, time: 1, clues: 2, resources: 1, text: "El cauce revela marcas antiguas iguales a las del mapa cifrado." },
      { danger: 0, time: 1, clues: 2, resources: 1, text: "El vado conduce a un campamento reciente con el emblema de Haru." }
    ])
  }),
  forest: Object.freeze({
    id: "forest", title: "Bosque cerrado", subtitle: "Peligro · recursos",
    description: "Es la ruta más corta y fértil, pero un enemigo puede bloquear el paso.",
    outcomes: Object.freeze([
      { danger: 1, time: 0, clues: 1, resources: 2, text: "Cruzas la maleza y encuentras hierbas medicinales junto a una fogata apagada." },
      { danger: 2, time: 0, clues: 1, resources: 2, text: "Un saqueador protege una mochila con suministros. Tendrás que abrirte paso en un duelo." },
      { danger: 1, time: 0, clues: 1, resources: 2, text: "Las ramas rotas forman un atajo hasta el campamento del médico." }
    ])
  })
});

export const RIVER_PASSAGES = Object.freeze([
  { id: "stones", label: "Piedras cubiertas de musgo" },
  { id: "reeds", label: "Franja de juncos doblados" },
  { id: "ford", label: "Vado de grava" }
]);
