// Outs: cartas que todavía pueden salir y que mejoran tu mano.
// Solo cuentan si la mejora usa al menos una de tus cartas (si la mejora está entera en la mesa, la tienen todos).

import { newDeck, sameCard, SUITS } from './cards.js';
import { evaluate, coreCards } from './hands.js';

const uses = (hand, hole) => coreCards(hand).some((c) => hole.some((h) => sameCard(h, c)));

// minCategory: solo cuenta mejoras que lleguen al menos a esa categoría (4 = escalera).
export function findOuts(hole, board, { minCategory = 0 } = {}) {
  if (board.length < 3 || board.length > 4) throw new Error('Los outs se calculan en el flop o en el turn');
  const known = [...hole, ...board];
  const current = evaluate(known);
  const unseen = newDeck().filter((c) => !known.some((k) => sameCard(k, c)));
  const outs = [];
  for (const card of unseen) {
    const hand = evaluate([...known, card]);
    if (hand.category > current.category && hand.category >= minCategory && uses(hand, hole)) outs.push({ card, hand });
  }
  return { current, outs, unseen: unseen.length, cardsToCome: 5 - board.length };
}

// Probabilidad exacta de que salga al menos un out en las cartas que quedan (1 o 2).
export function hitChance(outs, unseen, cardsToCome) {
  if (cardsToCome === 1) return outs / unseen;
  return 1 - ((unseen - outs) / unseen) * ((unseen - outs - 1) / (unseen - 1));
}

// Regla del 2 y del 4: outs x 4 en el flop (quedan 2 cartas), outs x 2 en el turn (queda 1).
export const ruleOf2and4 = (outs, cardsToCome) => outs * (cardsToCome === 2 ? 4 : 2);

// Palo del proyecto de color (4 cartas del mismo palo entre tus cartas y la mesa), si lo hay.
export function flushDrawSuit(hole, board) {
  const all = [...hole, ...board];
  return SUITS.find((s) => all.filter((c) => c.suit === s).length === 4 && hole.some((c) => c.suit === s)) ?? null;
}

// Agrupa los outs por la mano que consiguen: { 'Color': [cartas], 'Escalera': [...] }.
export function groupOuts(outs) {
  const groups = new Map();
  for (const o of outs) {
    const key = o.hand.category;
    if (!groups.has(key)) groups.set(key, { category: key, name: o.hand.name, cards: [] });
    groups.get(key).cards.push(o.card);
  }
  return [...groups.values()].sort((a, b) => b.category - a.category);
}
