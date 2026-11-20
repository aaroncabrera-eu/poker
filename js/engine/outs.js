// Outs: cartas que todavía pueden salir y que mejoran tu mano.
// Solo cuentan si la mejora usa al menos una de tus cartas (si la mejora está entera en la mesa, la tienen todos).

import { newDeck, sameCard, SUITS, SUIT_NAMES, rankName } from './cards.js';
import { evaluate, coreCards } from './hands.js';

const uses = (hand, hole) => coreCards(hand).some((c) => hole.some((h) => sameCard(h, c)));

// Una carta "solo empareja la mesa" si su valor ya está en la mesa y no en tus cartas:
// la pareja nueva sería de la mesa, así que la tendrían todos.
const pairsBoard = (card, hole, board) => board.some((b) => b.rank === card.rank) && !hole.some((h) => h.rank === card.rank);

// minCategory: solo cuenta mejoras que lleguen al menos a esa categoría (4 = escalera).
// Devuelve también `shared`: cartas que parecen mejorarte pero solo emparejan la mesa (no cuentan).
export function findOuts(hole, board, { minCategory = 0 } = {}) {
  if (board.length < 3 || board.length > 4) throw new Error('Los outs se calculan en el flop o en el turn');
  const known = [...hole, ...board];
  const current = evaluate(known);
  const unseen = newDeck().filter((c) => !known.some((k) => sameCard(k, c)));
  const outs = [];
  const shared = [];
  for (const card of unseen) {
    const hand = evaluate([...known, card]);
    if (hand.category <= current.category || hand.category < minCategory || !uses(hand, hole)) continue;
    // Emparejar la mesa solo cuenta si te da full o algo mejor (por ejemplo, de trío a full).
    if (hand.category <= 3 && pairsBoard(card, hole, board)) shared.push({ card, hand });
    else outs.push({ card, hand });
  }
  return { current, outs, shared, unseen: unseen.length, cardsToCome: 5 - board.length };
}

// Probabilidad exacta de que salga al menos un out en las cartas que quedan (1 o 2).
export function hitChance(outs, unseen, cardsToCome) {
  if (cardsToCome === 1) return outs / unseen;
  return 1 - ((unseen - outs) / unseen) * ((unseen - outs - 1) / (unseen - 1));
}

const pct = (x) => `${Math.round(x * 100)}%`;

// La cuenta exacta escrita con números, para enseñar a hacerla.
export function exactFormula(outs, unseen, cardsToCome) {
  if (cardsToCome === 1) return `${outs} outs entre ${unseen} cartas = ${outs}/${unseen} = ${pct(outs / unseen)}`;
  const miss = ((unseen - outs) / unseen) * ((unseen - outs - 1) / (unseen - 1));
  const m = Math.round(miss * 100);
  return `fallar las dos cartas = ${unseen - outs}/${unseen} × ${unseen - outs - 1}/${unseen - 1} = ${m}%, así que ligar = 100% − ${m}% = ${100 - m}%`;
}

// Regla del 2 y del 4: outs x 4 en el flop (quedan 2 cartas), outs x 2 en el turn (queda 1).
export const ruleOf2and4 = (outs, cardsToCome) => outs * (cardsToCome === 2 ? 4 : 2);

// Palo del proyecto de color (4 cartas del mismo palo entre tus cartas y la mesa), si lo hay.
export function flushDrawSuit(hole, board) {
  const all = [...hole, ...board];
  return SUITS.find((s) => all.filter((c) => c.suit === s).length === 4 && hole.some((c) => c.suit === s)) ?? null;
}

// Explicación de dónde sale el número de outs y el multiplicador, con las cartas concretas.
// Devuelve una lista de frases.
export function outsBreakdown(hole, board, r) {
  const n = r.outs.length;
  const lines = [];
  if (n === 0) {
    lines.push('Ninguna carta te mejora de verdad: lo que tienes ahora es lo que cuenta.');
  } else {
    const groups = groupOuts(r.outs);
    const parts = groups.map((g) => {
      const suits = new Set(g.cards.map((c) => c.suit));
      const ranks = [...new Set(g.cards.map((c) => c.rank))].sort((a, b) => b - a);
      let which;
      if ((g.category === 5 || g.category === 8) && suits.size === 1) {
        which = `cualquiera de los ${g.cards.length} ${SUIT_NAMES[[...suits][0]]} que quedan`;
      } else if (ranks.length === 1) {
        const left = g.cards.length;
        const fem = ranks[0] === 11 || ranks[0] === 12; // la Jota, la Reina
        const art = left === 1 ? (fem ? 'la' : 'el') : `${fem ? 'las' : 'los'} ${left}`;
        which = left === 4
          ? `cualquier ${rankName(ranks[0])} (hay 4, ${fem ? 'una' : 'uno'} de cada palo)`
          : `${art} ${rankName(ranks[0], left > 1)} que ${left === 1 ? 'queda' : 'quedan'}`;
      } else {
        which = `cualquier ${ranks.map((x) => rankName(x)).join(' o ')}`;
      }
      return { text: `${g.name}: ${which} → ${g.cards.length} ${g.cards.length === 1 ? 'carta' : 'cartas'}.`, count: g.cards.length };
    });
    parts.forEach((p) => lines.push(p.text));
    lines.push(parts.length > 1 ? `Total: ${parts.map((p) => p.count).join(' + ')} = ${n} outs.` : `Total: ${n} outs.`);
  }
  if (r.shared?.length) {
    const ranks = [...new Set(r.shared.map((s) => s.card.rank))].sort((a, b) => b - a)
      .map((x) => `${x === 11 || x === 12 ? 'las' : 'los'} ${rankName(x, true)}`);
    const list = ranks.length > 1 ? `${ranks.slice(0, -1).join(', ')} ni ${ranks.at(-1)}` : ranks[0];
    lines.push(`No cuentan ${list} (${r.shared.length} ${r.shared.length === 1 ? 'carta' : 'cartas'}): solo emparejarían la mesa, y esa pareja la tendrían todos los jugadores.`);
  }
  if (n > 0) {
    lines.push(r.cardsToCome === 2
      ? `¿Por qué × 4? Quedan 2 cartas por salir (turn y river). Cada out tiene más o menos un 2% de salir en cada carta (1 de ${r.unseen}), así que ${n} outs × 2% × 2 cartas ≈ ${n} × 4 = ${n * 4}%.`
      : `¿Por qué × 2? Solo queda 1 carta (el river) y cada out tiene más o menos un 2% de salir (1 de ${r.unseen}): ${n} outs × 2% = ${n * 2}%.`);
  }
  return lines;
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
