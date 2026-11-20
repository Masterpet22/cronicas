import { Timestamp } from "firebase-admin/firestore";

const uidPattern = /^[A-Za-z0-9_-]{1,128}$/;
const fixedBoard = "arena";
const safeLabel = value => typeof value === "string" && value.trim() === value
  && value.length > 0 && value.length <= 24 && !/[\p{Cc}\p{Cf}]/u.test(value);

function validParticipant(player, receivedAt) {
  return player?.kind === "player"
    && typeof player.uid === "string" && uidPattern.test(player.uid)
    && Number.isSafeInteger(player.sequence) && player.sequence > 0
    && Number.isSafeInteger(player.score) && player.score >= 0
    && player.achievedAt instanceof Timestamp && player.achievedAt.valueOf() <= receivedAt.valueOf()
    && (player.alias === null || safeLabel(player.alias))
    && (player.tier === undefined || safeLabel(player.tier));
}

function validRankedMatch(match, receivedAt) {
  if (!(receivedAt instanceof Timestamp) || match?.mode !== "arena-ranked" || match.status !== "validated"
    || !Array.isArray(match.players) || match.players.length !== 2
    || !match.players.every(player => validParticipant(player, receivedAt))) return false;
  const [left, right] = match.players;
  return left.uid !== right.uid && (match.winnerUid === null || [left.uid, right.uid].includes(match.winnerUid));
}

export async function publishValidatedRankedMatch(db, snapshot) {
  const match = snapshot?.data();
  if (!validRankedMatch(match, snapshot?.createTime)) return;

  const board = db.collection("cronicasRankings").doc(fixedBoard).collection("rankedEntries");
  const states = db.collection("cronicasRankingState").doc(fixedBoard).collection("players");
  const players = match.players.map(player => ({
    player,
    state: states.doc(player.uid),
    newEntry: board.doc()
  }));

  await db.runTransaction(async transaction => {
    const existing = await transaction.getAll(...players.map(({ state }) => state));
    for (const [index, { player, state, newEntry }] of players.entries()) {
      const previous = existing[index].data();
      if (previous && previous.sequence >= player.sequence) continue;

      const entry = previous ? board.doc(previous.publicId) : newEntry;
      transaction.set(state, { publicId: entry.id, sequence: player.sequence, visible: player.alias !== null });
      if (player.alias !== null) {
        const { alias, score, tier, achievedAt } = player;
        transaction.set(entry, { alias, score, achievedAt, ...(tier === undefined ? {} : { tier }) });
      } else if (previous?.visible) {
        transaction.delete(entry);
      }
    }
  });
}
