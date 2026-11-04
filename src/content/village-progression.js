// El acceso se concede al volver con éxito; leer un diálogo no adelanta el progreso.
export const VILLAGE_UNLOCKS = Object.freeze({
  headquarters: { prologue: true, reason: "Ren te recibe en el prólogo y abre el Cuartel General." },
  dojo: { prologue: true, reason: "Tu maestro te acompaña desde el prólogo." },
  shop: { missionId: "m01", reason: "Completa «Tras las huellas del gato» para abrir la Tienda de Hana." },
  archive: { book: true, reason: "Encuentra a Haru en «El médico errante» y lleva su libro a la Biblioteca." },
  inn: { saga: 2, reason: "Disponible al pasar a la saga 2, tras completar la saga 1." },
  missions: { saga: 2, reason: "Disponible al pasar a la saga 2, tras completar la saga 1." },
  event: { saga: 2, reason: "Disponible al pasar a la saga 2, tras completar la saga 1." },
  arena: { saga: 3, level: 16, reason: "Requiere llegar a la saga 3 y tener nivel 16 o superior." },
  tower: { rank: 2, reason: "Requiere rango 2 (Experto): nivel 15 y superar «El despertar de la segunda afinidad»." }
});
