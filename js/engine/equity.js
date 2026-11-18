// Probabilidad de ganar (equity) por simulación (método Monte Carlo):
// se completan al azar las cartas desconocidas muchas veces y se cuenta cuántas ganas.

import { newDeck, sameCard } from './cards.js';
import { evaluate, compareHands } from './hands.js';

// hole: tus 2 cartas; board: 0-5 cartas; opponents: nº de rivales (con cartas al azar).
// Devuelve { win, tie, equity } en tanto por uno. `equity` reparte los empates.
export function estimateEquity(hole, board, opponents, { iterations = 1000, rng = Math.random, dead = [] } = {}) {
  const known = [...hole, ...board, ...dead];
  const pool = newDeck().filter((c) => !known.some((k) => sameCard(c, k)));
  const needBoard = 5 - board.length;
  const need = needBoard + 2 * opponents;

  let win = 0;
  let tie = 0;
  let equity = 0;
  for (let it = 0; it < iterations; it++) {
    // Barajado parcial: solo las primeras `need` cartas.
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const fullBoard = board.concat(pool.slice(0, needBoard));
    const mine = evaluate([...hole, ...fullBoard]);
    let beaten = false;
    let ties = 0;
    for (let o = 0; o < opponents; o++) {
      const k = needBoard + 2 * o;
      const c = compareHands(mine, evaluate([pool[k], pool[k + 1], ...fullBoard]));
      if (c < 0) {
        beaten = true;
        break;
      }
      if (c === 0) ties++;
    }
    if (beaten) continue;
    if (ties === 0) {
      win++;
      equity += 1;
    } else {
      tie++;
      equity += 1 / (ties + 1);
    }
  }
  return { win: win / iterations, tie: tie / iterations, equity: equity / iterations };
}
