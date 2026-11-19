// Ejercicio: ¿Qué mano tienes? Tus 2 cartas + 5 de la mesa: elige tu mejor jugada.

import { h } from '../ui/dom.js';
import { renderCards } from '../ui/cards.js';
import { Deck, sameCard } from '../engine/cards.js';
import { evaluate, coreCards, CATEGORIES } from '../engine/hands.js';
import { runExercise, feedbackBox } from '../ui/exercise.js';

// Peso de cada categoría al generar (para que no salgan casi siempre parejas y cartas altas).
const WEIGHTS = [1, 2, 2, 2, 2, 2, 1.5, 0.6];

function pickCategory() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WEIGHTS.length; i++) if ((r -= WEIGHTS[i]) < 0) return i;
  return 1;
}

function makeDeal() {
  const target = pickCategory();
  let deal;
  for (let tries = 0; tries < 20000; tries++) {
    const d = new Deck();
    const hole = d.draw(2);
    const board = d.draw(5);
    const hand = evaluate([...hole, ...board]);
    deal = { hole, board, hand };
    if (hand.category === target) break;
  }
  return deal;
}

export function handExercise() {
  return runExercise({
    statsKey: 'stats:hand',
    makeDeal,
    isCorrect: (deal, a) => a === deal.hand.category,
    render: ({ deal, answer, choose, next, stats }) => {
      const done = answer !== null;
      const best = done ? deal.hand.cards : null;
      const ok = answer === deal.hand.category;
      const usesHole = deal.hand.cards.some((c) => deal.hole.some((x) => sameCard(x, c)));

      return [
        h('div', { class: 'ex-intro' },
          h('p', { class: 'muted' }, '¿Cuál es tu mejor mano de 5 cartas combinando tus 2 cartas con las 5 de la mesa?'),
          stats.bar(),
        ),
        h('div', { class: 'seat' },
          h('div', { class: 'seat-top' },
            h('span', { class: 'seat-name' }, 'Tus cartas'),
            renderCards(deal.hole, { size: 'md', highlight: best, className: 'soft' }),
          ),
        ),
        h('div', { class: 'felt' },
          h('span', { class: 'felt-label' }, 'Mesa · board'),
          renderCards(deal.board, { size: 'board', highlight: best, className: 'soft' }),
        ),
        h('div', { class: 'cat-grid' },
          [...CATEGORIES].reverse().map((cat) =>
            h('button', {
              class: ['btn', 'cat-btn', done && cat.id === deal.hand.category && 'correct', done && cat.id === answer && !ok && 'wrong'].filter(Boolean).join(' '),
              disabled: done,
              onClick: () => choose(cat.id),
            }, cat.name)),
        ),
        done && feedbackBox(ok, [
          h('p', {}, `Tienes ${deal.hand.description}.`),
          h('div', { class: 'fb-cards' },
            h('span', { class: 'small muted' }, 'Tu mejor mano de 5:'),
            renderCards(deal.hand.cards, { size: 'sm', highlight: coreCards(deal.hand), className: 'soft' }),
          ),
          !usesHole && h('p', {}, 'Tu mejor mano está entera en la mesa, así que la tienen todos los jugadores.'),
          !ok && h('p', { class: 'small muted' }, `Recuerda: ${CATEGORIES[answer].name} = ${CATEGORIES[answer].tip.toLowerCase()}. Puedes mirar la chuleta arriba.`),
        ], next, 'Siguiente mano'),
      ];
    },
  });
}
