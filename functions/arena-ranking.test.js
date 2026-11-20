import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { publishValidatedRankedMatch } from "./arena-ranking.js";

test("publica solo combates clasificados validados y conserva la secuencia más reciente", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST
}, async () => {
  const app = initializeApp({ projectId: "demo-cronicas" });
  try {
    const db = getFirestore(app);
    const matches = db.collection("cronicasRankedMatches");
    const board = db.collection("cronicasRankings/arena/rankedEntries");
    const states = db.collection("cronicasRankingState/arena/players");
    const playerA = randomUUID();
    const playerB = randomUUID();
    const achievedAt = Timestamp.fromMillis(Date.now() - 1000);
    const player = (uid, sequence, score, alias) => ({ kind: "player", uid, sequence, score, alias, achievedAt, tier: "Bronce" });
    const match = (left, right, fields = {}) => ({
      mode: "arena-ranked", status: "validated", winnerUid: left.uid, players: [left, right], ...fields
    });
    const record = async data => {
      const ref = await matches.add(data);
      return ref.get();
    };
    const left = player(playerA, 1, 140, "Luna");
    const right = player(playerB, 1, 100, "Sol");

    for (const rejected of [
      match(left, right, { mode: "arena-exhibition" }),
      match(left, right, { status: "pending" }),
      match(left, right, { winnerUid: "otro" }),
      match(left, { ...right, kind: "bot" }),
      match(left, { ...right, uid: playerA }),
      match(left, { ...right, achievedAt: Timestamp.fromMillis(Date.now() + 60000) })
    ]) {
      await publishValidatedRankedMatch(db, await record(rejected));
    }
    assert.equal((await states.doc(playerA).get()).exists, false);
    assert.equal((await states.doc(playerB).get()).exists, false);

    const valid = await record(match({ ...left, email: "private@example.test" }, right));
    await publishValidatedRankedMatch(db, valid);
    const first = (await states.doc(playerA).get()).data();
    const second = (await states.doc(playerB).get()).data();
    assert.notEqual(first.publicId, playerA);
    assert.notEqual(first.publicId, second.publicId);
    const publicEntry = board.doc(first.publicId);
    assert.deepEqual((await publicEntry.get()).data(), { alias: "Luna", score: 140, achievedAt, tier: "Bronce" });

    const newest = await record(match(player(playerA, 3, 220, "Luna"), player(playerB, 3, 95, null)));
    const stale = await record(match(player(playerA, 2, 170, "Luna"), player(playerB, 2, 110, "Sol")));
    await publishValidatedRankedMatch(db, newest);
    await publishValidatedRankedMatch(db, stale);
    await publishValidatedRankedMatch(db, valid);
    await publishValidatedRankedMatch(db, newest);
    assert.equal((await publicEntry.get()).get("score"), 220);
    assert.equal((await board.doc(second.publicId).get()).exists, false);
    assert.equal((await states.doc(playerB).get()).get("sequence"), 3);
  } finally {
    await deleteApp(app);
  }
});
