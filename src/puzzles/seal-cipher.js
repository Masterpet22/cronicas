export const CIPHER_SIZE = 6;
export const CIPHER_TYPES = 5;
const CELLS = CIPHER_SIZE * CIPHER_SIZE;
const seedOf = (value) => (Number(value) >>> 0) || 0x4a61c3d9;

function random(state, limit) {
  let value = state.seed;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  state.seed = value >>> 0;
  return state.seed % limit;
}

export function cipherMatches(board) {
  const groups = [];
  for (const direction of ["row", "column"]) {
    for (let line = 0; line < CIPHER_SIZE; line += 1) {
      let run = [];
      for (let offset = 0; offset <= CIPHER_SIZE; offset += 1) {
        const index = direction === "row" ? line * CIPHER_SIZE + offset : offset * CIPHER_SIZE + line;
        if (offset < CIPHER_SIZE && (run.length === 0 || board[index] === board[run[0]])) run.push(index);
        else {
          if (run.length >= 3) groups.push({ cells: run, direction });
          run = offset < CIPHER_SIZE ? [index] : [];
        }
      }
    }
  }
  return groups;
}

function neighbours(from, to) {
  return Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from < CELLS && to >= 0 && to < CELLS
    && Math.abs(Math.floor(from / CIPHER_SIZE) - Math.floor(to / CIPHER_SIZE)) + Math.abs(from % CIPHER_SIZE - to % CIPHER_SIZE) === 1;
}

function swapped(board, from, to) {
  const copy = [...board];
  [copy[from], copy[to]] = [copy[to], copy[from]];
  return copy;
}

export function cipherMoves(state) {
  const moves = [];
  for (let from = 0; from < CELLS; from += 1) {
    for (const to of [from + 1, from + CIPHER_SIZE]) {
      if (!neighbours(from, to)) continue;
      if (state.specials[from] || state.specials[to] || cipherMatches(swapped(state.board, from, to)).length) moves.push({ from, to });
    }
  }
  return moves;
}

function fillPlayable(state) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    state.board = [];
    for (let index = 0; index < CELLS; index += 1) {
      const allowed = Array.from({ length: CIPHER_TYPES }, (_, type) => type).filter((type) => !(
        (index % CIPHER_SIZE >= 2 && state.board[index - 1] === type && state.board[index - 2] === type)
        || (index >= CIPHER_SIZE * 2 && state.board[index - CIPHER_SIZE] === type && state.board[index - CIPHER_SIZE * 2] === type)
      ));
      state.board.push(allowed[random(state, allowed.length)]);
    }
    if (cipherMoves(state).length) return;
  }
  // Respaldo determinista sin combinaciones iniciales y con un intercambio válido.
  state.board = Array.from({ length: CELLS }, (_, index) => (Math.floor(index / CIPHER_SIZE) * 2 + index % CIPHER_SIZE) % CIPHER_TYPES);
  [state.board[0], state.board[1], state.board[2], state.board[7]] = [0, 1, 0, 0];
}

export function createCipherState(seed = 0x4a61c3d9) {
  const state = { board: [], specials: Array(CELLS).fill(null), revealed: Array(CELLS).fill(false), moves: 0, seed: seedOf(seed) };
  fillPlayable(state);
  return state;
}

export function cipherComplete(state) {
  return Boolean(state && Array.isArray(state.revealed) && state.revealed.length === CELLS && state.revealed.every((cell) => cell === true));
}

export function normalizeCipherState(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const state = {
    board: Array.isArray(candidate.board) ? candidate.board.slice(0, CELLS) : [],
    specials: Array.from({ length: CELLS }, (_, index) => ["row", "column"].includes(candidate.specials?.[index]) ? candidate.specials[index] : null),
    revealed: Array.from({ length: CELLS }, (_, index) => candidate.revealed?.[index] === true),
    moves: Math.min(99999, Math.max(0, Math.floor(Number(candidate.moves) || 0))), seed: seedOf(candidate.seed)
  };
  if (state.board.length !== CELLS || state.board.some((type) => !Number.isInteger(type) || type < 0 || type >= CIPHER_TYPES) || cipherMatches(state.board).length) fillPlayable(state);
  if (!cipherComplete(state) && !cipherMoves(state).length) return shuffleCipher(state);
  return state;
}

export function shuffleCipher(candidate) {
  const state = { ...candidate, board: [...candidate.board], specials: [...candidate.specials], revealed: [...candidate.revealed] };
  const pieces = state.board.map((type, index) => ({ type, special: state.specials[index] }));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    for (let index = pieces.length - 1; index > 0; index -= 1) {
      const other = random(state, index + 1);
      [pieces[index], pieces[other]] = [pieces[other], pieces[index]];
    }
    state.board = pieces.map((piece) => piece.type);
    state.specials = pieces.map((piece) => piece.special);
    if (!cipherMatches(state.board).length && cipherMoves(state).length) return state;
  }
  fillPlayable(state);
  return state;
}

function expandedCells(state, cells) {
  const result = new Set(cells);
  for (const index of result) {
    const special = state.specials[index];
    if (!special) continue;
    for (let offset = 0; offset < CIPHER_SIZE; offset += 1) {
      result.add(special === "row" ? Math.floor(index / CIPHER_SIZE) * CIPHER_SIZE + offset : offset * CIPHER_SIZE + index % CIPHER_SIZE);
    }
  }
  return [...result];
}

function collapse(state, cleared, retained) {
  const falls = [];
  const removed = new Set(cleared.filter((index) => !retained.has(index)));
  for (let column = 0; column < CIPHER_SIZE; column += 1) {
    const survivors = [];
    for (let row = CIPHER_SIZE - 1; row >= 0; row -= 1) {
      const index = row * CIPHER_SIZE + column;
      if (!removed.has(index)) survivors.push({ from: index, type: state.board[index], special: state.specials[index] });
    }
    for (let row = CIPHER_SIZE - 1; row >= 0; row -= 1) {
      const target = row * CIPHER_SIZE + column;
      const piece = survivors[CIPHER_SIZE - 1 - row];
      state.board[target] = piece ? piece.type : random(state, CIPHER_TYPES);
      state.specials[target] = piece ? piece.special : null;
      falls.push({ from: piece ? piece.from : (row - CIPHER_SIZE) * CIPHER_SIZE + column, to: target });
    }
  }
  return falls;
}

export function swapCipher(candidate, from, to) {
  const original = normalizeCipherState(candidate);
  if (!original || cipherComplete(original) || !neighbours(from, to)) return { state: original, valid: false, steps: [] };
  const state = { ...original, board: swapped(original.board, from, to), specials: swapped(original.specials, from, to), revealed: [...original.revealed], moves: original.moves + 1 };
  let groups = cipherMatches(state.board);
  const activated = [from, to].filter((index) => state.specials[index]);
  if (!groups.length && !activated.length) return { state: original, valid: false, steps: [] };
  const steps = [];
  for (let cascade = 0; cascade < 40 && (groups.length || cascade === 0 && activated.length); cascade += 1) {
    const before = { board: [...state.board], specials: [...state.specials], revealed: [...state.revealed] };
    const cleared = expandedCells(state, [...groups.flatMap((group) => group.cells), ...(cascade === 0 ? activated : [])]);
    const retained = new Set();
    for (const group of groups.filter((entry) => entry.cells.length >= 4)) {
      const index = group.cells.includes(to) && cascade === 0 ? to : group.cells[Math.floor(group.cells.length / 2)];
      if (!state.specials[index] && !activated.length) {
        retained.add(index);
        state.specials[index] = group.direction;
      }
    }
    cleared.forEach((index) => { state.revealed[index] = true; });
    const falls = collapse(state, cleared, retained);
    steps.push({ before, cleared, falls, after: { board: [...state.board], specials: [...state.specials], revealed: [...state.revealed] } });
    groups = cipherMatches(state.board);
  }
  let reshuffled = false;
  if (groups.length || !cipherComplete(state) && !cipherMoves(state).length) {
    const shuffled = shuffleCipher(state);
    Object.assign(state, shuffled); reshuffled = true;
  }
  return { state, valid: true, steps, reshuffled };
}

export function cipherHint(state) {
  if (!state || cipherComplete(state)) return null;
  return cipherMoves(state).map((move) => {
    const board = swapped(state.board, move.from, move.to);
    const specials = swapped(state.specials, move.from, move.to);
    const cells = expandedCells({ ...state, specials }, [...cipherMatches(board).flatMap((group) => group.cells), ...[move.from, move.to].filter((index) => specials[index])]);
    return { ...move, score: cells.filter((index) => !state.revealed[index]).length * 10 + cells.length };
  }).sort((a, b) => b.score - a.score)[0] || null;
}

export function applyCipherAction(candidate, action, payload = {}) {
  const state = normalizeCipherState(candidate);
  if (action === "start") return { state: state || createCipherState(), valid: true, steps: [] };
  if (!state || cipherComplete(state)) return { state, valid: false, steps: [] };
  if (action === "swap") return swapCipher(state, payload.from, payload.to);
  if (action === "shuffle") return { state: shuffleCipher(state), valid: true, steps: [], reshuffled: true };
  return { state, valid: false, steps: [] };
}
