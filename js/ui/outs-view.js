// Explicación visual de unos outs: qué cartas son, por qué, y la regla del 2 y del 4 frente al cálculo exacto.

import { h } from './dom.js';
import { renderCards } from './cards.js';
import { SUIT_NAMES, rankName } from '../engine/cards.js';
import { groupOuts, hitChance, ruleOf2and4, flushDrawSuit } from '../engine/outs.js';

const pct = (x) => `${Math.round(x * 100)}%`;

export function outsExplanation(hole, board, r) {
  const n = r.outs.length;
  if (n === 0) return h('p', {}, 'Ninguna carta mejora tu mano por sí sola.');
  const groups = groupOuts(r.outs);
  const lines = [];

  const suit = flushDrawSuit(hole, board);
  const flushGroup = groups.find((g) => g.category === 5 || g.category === 8);
  if (suit && flushGroup) {
    lines.push(`Proyecto de color: ya tienes 4 cartas de ${SUIT_NAMES[suit]}. Hay 13 de cada palo, así que quedan 13 − 4 = 9.`);
  }
  const straight = groups.find((g) => g.category === 4);
  if (straight) {
    const ranks = [...new Set(straight.cards.map((c) => c.rank))].sort((a, b) => b - a).map((x) => rankName(x));
    const nRanks = ranks.length;
    lines.push(`Proyecto de escalera: te vale cualquier ${ranks.join(' o ')}. ${nRanks === 2 ? 'Es una escalera abierta (dos valores te sirven).' : nRanks === 1 ? 'Es una escalera interna o gutshot (solo te sirve un valor).' : ''} Cada valor tiene 4 cartas, una por palo.`);
    if (flushGroup && suit) lines.push('Si alguna carta te da escalera y color a la vez, se cuenta una sola vez.');
  }
  for (const g of groups.filter((x) => ![4, 5, 8].includes(x.category))) {
    const ranks = [...new Set(g.cards.map((c) => c.rank))].sort((a, b) => b - a).map((x) => rankName(x));
    const list = ranks.length > 1 ? `${ranks.slice(0, -1).join(', ')} o ${ranks.at(-1)}` : ranks[0];
    lines.push(`${g.name}: te vale cualquier ${list} que quede en la baraja (${g.cards.length} ${g.cards.length === 1 ? 'carta' : 'cartas'}).`);
  }

  const toCome = r.cardsToCome;
  const exact = hitChance(n, r.unseen, toCome);
  const rule = ruleOf2and4(n, toCome);
  const next1 = hitChance(n, r.unseen, 1);

  return h('div', { class: 'outs-view' },
    lines.map((l) => h('p', {}, l)),
    h('div', { class: 'out-groups' },
      groups.map((g) => h('div', { class: 'out-group' },
        h('span', { class: 'small' }, `${g.name}: ${g.cards.length}`),
        renderCards(g.cards, { size: 'xs', className: 'wrap' }),
      )),
    ),
    h('div', { class: 'rule-box' },
      h('strong', {}, 'De cabeza: regla del 2 y del 4'),
      toCome === 2
        ? h('p', {}, `Quedan 2 cartas (turn y river): outs × 4 = ${n} × 4 ≈ ${rule}%. Exacto: ${pct(exact)}.`)
        : h('p', {}, `Queda 1 carta (river): outs × 2 = ${n} × 2 ≈ ${rule}%. Exacto: ${pct(exact)}.`),
      toCome === 2 && h('p', { class: 'small muted' }, `Solo para la siguiente carta: ${n} × 2 ≈ ${n * 2}% (exacto ${pct(next1)}).`),
      h('p', { class: 'small muted' }, `Quedan ${r.unseen} cartas que no ves. Con muchos outs (más de 8) la regla del 4 se pasa un poco.`),
    ),
  );
}
