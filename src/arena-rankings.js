import { collection, getDocs, getFirestore, limit, orderBy, query, startAfter } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore-lite.js";
import { firebaseApp } from "./firebase-app.js?v=1.0.0";

const pageSize = 20;
const rankedEntries = collection(getFirestore(firebaseApp), "cronicasRankings", "arena", "rankedEntries");

export async function loadArenaRankings(cursor) {
  const order = [orderBy("score", "desc"), orderBy("achievedAt")];
  const constraints = cursor ? [...order, startAfter(cursor), limit(pageSize + 1)] : [...order, limit(pageSize + 1)];
  const result = await getDocs(query(rankedEntries, ...constraints));
  const page = result.docs.slice(0, pageSize);
  return {
    entries: page.map(snapshot => {
      const { alias, tier, score } = snapshot.data();
      return { id: snapshot.id, alias, tier, score };
    }),
    cursor: result.size > pageSize ? page.at(-1) : null
  };
}
