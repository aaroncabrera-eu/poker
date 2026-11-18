// Evaluador de manos de Texas Hold'em.
// Recibe de 5 a 7 cartas, encuentra la mejor combinación de 5 y la describe.

import { rankName } from './cards.js';

// Categorías de menor a mayor. Es también la fuente de datos de la chuleta.
export const CATEGORIES = [
  { id: 0, name: 'Carta alta', en: 'High card', example: 'Ah Jd 8c 5s 2h',
    tip: 'Nada ligado: gana quien tenga la carta más alta.' },
  { id: 1, name: 'Pareja', en: 'One pair', example: 'Kh Kd 9c 6s 3h',
    tip: 'Dos cartas del mismo valor.' },
  { id: 2, name: 'Doble pareja', en: 'Two pair', example: 'Qh Qc 7d 7s Ah',
    tip: 'Dos parejas distintas.' },
  { id: 3, name: 'Trío', en: 'Three of a kind', example: '8s 8h 8d Kc 4s',
    tip: 'Tres cartas del mismo valor.' },
  { id: 4, name: 'Escalera', en: 'Straight', example: '9c 8d 7h 6s 5c',
    tip: 'Cinco valores seguidos, de cualquier palo. El As vale arriba (10-J-Q-K-A) o abajo (A-2-3-4-5).' },
  { id: 5, name: 'Color', en: 'Flush', example: 'Ah Jh 9h 4h 2h',
    tip: 'Cinco cartas del mismo palo, no seguidas.' },
  { id: 6, name: 'Full', en: 'Full house', example: '10s 10h 10d 4c 4s',
    tip: 'Un trío más una pareja.' },
  { id: 7, name: 'Póker', en: 'Four of a kind', example: '5s 5h 5d 5c Ks',
    tip: 'Cuatro cartas del mismo valor.' },
  { id: 8, name: 'Escalera de color', en: 'Straight flush', example: '9s 8s 7s 6s 5s',
    tip: 'Escalera con las cinco cartas del mismo palo. La más alta (10 a As) se llama escalera real (royal flush).' },
];

// Evalúa exactamente 5 cartas.
// Devuelve { category, values, cards }. `values` sirve para desempatar
// dentro de la misma categoría (se comparan en orden).
export function evaluate5(cards) {
  if (cards.length !== 5) throw new Error('evaluate5 necesita 5 cartas');

  const isFlush = cards.every((c) => c.suit === cards[0].suit);

  // Agrupar por valor: [[rank, cuántas], ...] ordenado por cantidad y luego valor.
  const counts = new Map();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  // Escalera: 5 valores distintos y seguidos. Caso especial: A-2-3-4-5 (el As vale 1).
  let straightHigh = 0;
  if (groups.length === 5) {
    const r = groups.map((g) => g[0]); // ya ordenados de mayor a menor
    if (r[0] - r[4] === 4) straightHigh = r[0];
    else if (r[0] === 14 && r[1] === 5) straightHigh = 5;
  }

  // Ordenar las cartas como se "leen": grupos grandes primero; en la escalera A-5, el As al final.
  const order = groups.map((g) => g[0]);
  const sorted = cards.slice().sort((a, b) => order.indexOf(a.rank) - order.indexOf(b.rank));
  if (straightHigh === 5) sorted.push(sorted.shift());

  const shape = groups.map((g) => g[1]).join('');
  let category;
  let values;
  if (straightHigh && isFlush) [category, values] = [8, [straightHigh]];
  else if (shape === '41') [category, values] = [7, order];
  else if (shape === '32') [category, values] = [6, order];
  else if (isFlush) [category, values] = [5, order];
  else if (straightHigh) [category, values] = [4, [straightHigh]];
  else if (shape === '311') [category, values] = [3, order];
  else if (shape === '221') [category, values] = [2, order];
  else if (shape === '2111') [category, values] = [1, order];
  else [category, values] = [0, order];

  return { category, values, cards: sorted };
}

// > 0 si a gana, < 0 si gana b, 0 si empatan.
export function compareHands(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < a.values.length; i++) {
    if (a.values[i] !== b.values[i]) return a.values[i] - b.values[i];
  }
  return 0;
}

function* combinations(arr, k, start = 0, picked = []) {
  if (picked.length === k) {
    yield picked;
    return;
  }
  for (let i = start; i <= arr.length - (k - picked.length); i++) {
    yield* combinations(arr, k, i + 1, [...picked, arr[i]]);
  }
}

// Evalúa 5, 6 o 7 cartas (2 propias + mesa) y devuelve la mejor mano de 5.
export function evaluate(cards) {
  if (cards.length < 5 || cards.length > 7) throw new Error('Se necesitan entre 5 y 7 cartas');
  let best = null;
  for (const combo of combinations(cards, 5)) {
    const h = evaluate5(combo);
    if (!best || compareHands(h, best) > 0) best = h;
  }
  return { ...best, name: CATEGORIES[best.category].name, en: CATEGORIES[best.category].en,
    description: describe(best) };
}

// Descripción en lenguaje natural: "Full de Reyes con Doses".
export function describe({ category, values }) {
  const [a, b] = values;
  switch (category) {
    case 8: return a === 14 ? 'Escalera real' : `Escalera de color al ${rankName(a)}`;
    case 7: return `Póker de ${rankName(a, true)}`;
    case 6: return `Full de ${rankName(a, true)} con ${rankName(b, true)}`;
    case 5: return `Color al ${rankName(a)}`;
    case 4: return `Escalera al ${rankName(a)}`;
    case 3: return `Trío de ${rankName(a, true)}`;
    case 2: return `Doble pareja de ${rankName(a, true)} y ${rankName(b, true)}`;
    case 1: return `Pareja de ${rankName(a, true)}`;
    default: return `Carta alta: ${rankName(a)}`;
  }
}

// Dado un tablero y las cartas de varios jugadores, devuelve los índices de los ganadores
// (más de uno si hay empate y se reparten el bote) y la mano de cada jugador.
export function findWinners(holeCardsList, board) {
  const hands = holeCardsList.map((hole) => evaluate([...hole, ...board]));
  let winners = [];
  hands.forEach((h, i) => {
    if (winners.length === 0) winners = [i];
    else {
      const cmp = compareHands(h, hands[winners[0]]);
      if (cmp > 0) winners = [i];
      else if (cmp === 0) winners.push(i);
    }
  });
  return { winners, hands };
}
