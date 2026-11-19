// Ejercicio: ¿Cuántos outs tienes? (cartas que te dan escalera o mejor)

import { h } from '../ui/dom.js';
import { renderCards } from '../ui/cards.js';
import { Deck } from '../engine/cards.js';
import { findOuts } from '../engine/outs.js';
import { runExercise, feedbackBox, shuffleArr } from '../ui/exercise.js';
import { outsExplanation } from '../ui/outs-view.js';

const COMMON = [2, 3, 4, 6, 8, 9, 12, 15];

function makeDeal() {
  for (;;) {
    const d = new Deck();
    const hole = d.draw(2);
    const board = d.draw(Math.random() < 0.7 ? 3 : 4);
    const r = findOuts(hole, board, { minCategory: 4 });
    const n = r.outs.length;
    if (r.current.category <= 2 && n >= 4 && n <= 15) {
      const pool = shuffleArr(COMMON.filter((x) => x !== n)).sort((a, b) => Math.abs(a - n) - Math.abs(b - n));
      const options = [n, ...pool.slice(0, 3)].sort((a, b) => a - b);
      return { hole, board, r, n, options };
    }
  }
}

export function outsExercise() {
  return runExercise({
    statsKey: 'stats:outs',
    makeDeal,
    isCorrect: (deal, a) => a === deal.n,
    render: ({ deal, answer, choose, next, stats }) => {
      const done = answer !== null;
      const ok = answer === deal.n;
      const street = deal.board.length === 3 ? 'flop' : 'turn';
      return [
        h('div', { class: 'ex-intro' },
          h('p', { class: 'muted' }, `Estás en el ${street}. ¿Cuántas cartas de las que quedan te darían escalera o algo mejor? Esas cartas son tus outs.`),
          stats.bar(),
        ),
        h('div', { class: 'seat' },
          h('div', { class: 'seat-top' },
            h('div', { class: 'seat-info' },
              h('span', { class: 'seat-name' }, 'Tus cartas'),
              h('span', { class: 'seat-hand' }, `Ahora: ${deal.r.current.description}`),
            ),
            renderCards(deal.hole, { size: 'md' }),
          ),
        ),
        h('div', { class: 'felt' },
          h('span', { class: 'felt-label' }, `Mesa · ${street}`),
          renderCards([...deal.board, ...Array(5 - deal.board.length).fill(null)], { size: 'board', empty: 'slot' }),
        ),
        h('div', { class: 'answers four' },
          deal.options.map((n) =>
            h('button', {
              class: ['btn', 'answer', done && n === deal.n && 'correct', done && n === answer && !ok && 'wrong'].filter(Boolean).join(' '),
              disabled: done,
              onClick: () => choose(n),
            }, String(n))),
        ),
        done && feedbackBox(ok, [
          h('p', {}, `Tienes ${deal.n} outs.`),
          outsExplanation(deal.hole, deal.board, deal.r),
        ], next, 'Siguiente'),
      ];
    },
  });
}
