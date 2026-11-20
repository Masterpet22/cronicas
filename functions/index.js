import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { publishValidatedRankedMatch } from "./arena-ranking.js";

initializeApp();

export const publishArenaRankedMatch = onDocumentCreated({
  document: "cronicasRankedMatches/{matchId}",
  region: "southamerica-west1",
  retry: true
}, event => publishValidatedRankedMatch(getFirestore(), event.data));
