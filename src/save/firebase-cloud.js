import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { doc, getDoc, getFirestore, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore-lite.js";

// Configuración pública de la aplicación web de Firebase.
const app = initializeApp({
  apiKey: "AIzaSyBcfzt3BP3iT80WhFjBR0n35-xIfw01vOs",
  authDomain: "cronicas-f112f.firebaseapp.com",
  projectId: "cronicas-f112f",
  appId: "1:17644932355:web:529738bf95039595e46d36"
});
const auth = getAuth(app);
const db = getFirestore(app);
const saveRef = (uid, slot) => doc(db, "cronicasPlayers", uid, "saves", String(slot));

export const ready = () => auth.authStateReady();
export const currentUser = () => auth.currentUser;
export const watchAccount = (listener) => onAuthStateChanged(auth, listener);
export const logIn = () => signInWithPopup(auth, new GoogleAuthProvider());
export const logOut = () => signOut(auth);
export async function readCopy(uid, slot) {
  return (await getDoc(saveRef(uid, slot))).data() ?? null;
}

export async function uploadCopy(uid, slot, payload, expectedRevision) {
  if (new TextEncoder().encode(payload).length > 200_000) {
    throw Object.assign(new Error("La partida supera el tamaño admitido."), { code: "save/too-large" });
  }
  const ref = saveRef(uid, slot);
  await runTransaction(db, async (transaction) => {
    const current = (await transaction.get(ref)).data();
    if ((current?.revision ?? null) !== expectedRevision) {
      throw Object.assign(new Error("La copia cambió en otro dispositivo."), { code: "save/conflict" });
    }
    transaction.set(ref, { payload, revision: (expectedRevision ?? 0) + 1, updatedAt: serverTimestamp() });
  });
}
