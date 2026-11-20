// Ejercicio: ¿Qué probabilidad tienes de ligar tu proyecto? Con la solución paso a paso.

import { h } from '../ui/dom.js';
import { renderCards } from '../ui/cards.js';
import { Deck } from '../engine/cards.js';
import { findOuts, hitChance, ruleOf2and4, exactFormula, groupOuts } from '../engine/outs.js';
import { runExercise, feedbackBox, shuffleArr } from '../ui/exercise.js';

function makeDeal() {
  for (;;) {
    const d = new Deck();
    const hole = d.draw(2);
    const board = d.draw(Math.random() < 0.6 ? 3 : 4);
    const r = findOuts(hole, board, { minCategory: 4 });
    const n = r.outs.length;
    if (r.current.category > 2 || n < 4 || n > 15) continue;
    const exact = Math.round(hitChance(n, r.unseen, r.cardsToCome) * 100);
    // Opciones: la correcta y errores típicos (usar el multiplicador equivocado, contar mal...).
    const wrongMult = r.cardsToCome === 2 ? n * 2 : n * 4;
    const candidates = shuffleArr([wrongMult, exact + 12, exact - 10, exact + 20, Math.round(exact / 2)]);
    const options = [exact];
    for (const c of candidates) {
      if (c > 0 && c < 100 && options.every((o) => Math.abs(o - c) >= 5)) options.push(c);
      if (options.length === 4) break;
    }
    return { hole, board, r, n, exact, options: options.sort((a, b) => a - b) };
  }
}

export function oddsExercise() {
  return runExercise({
    statsKey: 'stats:odds',
    makeDeal,
    isCorrect: (deal, a) => a === deal.exact,
    render: ({ deal, answer, choose, next, stats }) => {
      const done = answer !== null;
      const ok = answer === deal.exact;
      const { r, n } = deal;
      const flop = r.cardsToCome === 2;
      const seen = 2 + deal.board.length;
      const mult = flop ? 4 : 2;
      const groups = groupOuts(r.outs);

      return [
        h('div', { class: 'ex-intro' },
          h('p', { class: 'muted' }, flop
            ? 'Estás en el flop. ¿Qué probabilidad tienes de conseguir escalera o algo mejor antes del river (con las 2 cartas que faltan)?'
            : 'Estás en el turn. ¿Qué probabilidad tienes de conseguir escalera o algo mejor en el river?'),
          stats.bar(),
        ),
        h('div', { class: 'seat' },
          h('div', { class: 'seat-top' },
            h('div', { class: 'seat-info' },
              h('span', { class: 'seat-name' }, 'Tus cartas'),
              h('span', { class: 'seat-hand' }, `Ahora: ${r.current.description}`),
            ),
            renderCards(deal.hole, { size: 'md' }),
          ),
        ),
        h('div', { class: 'felt' },
          h('span', { class: 'felt-label' }, `Mesa · ${flop ? 'flop' : 'turn'}`),
          renderCards([...deal.board, ...Array(5 - deal.board.length).fill(null)], { size: 'board', empty: 'slot' }),
        ),
        h('div', { class: 'answers four' },
          deal.options.map((x) =>
            h('button', {
              class: ['btn', 'answer', done && x === deal.exact && 'correct', done && x === answer && !ok && 'wrong'].filter(Boolean).join(' '),
              disabled: done,
              onClick: () => choose(x),
            }, `${x}%`)),
        ),
        done && feedbackBox(ok, [
          h('ol', { class: 'steps' },
            h('li', {},
              h('strong', {}, 'Cuenta tus outs. '),
              `Tienes ${n}: ${groups.map((g) => `${g.cards.length} para ${g.name.toLowerCase()}`).join(' y ')}.`,
              renderCards(r.outs.map((o) => o.card), { size: 'xs', className: 'wrap step-cards' }),
            ),
            h('li', {},
              h('strong', {}, 'Cuenta las cartas que no ves. '),
              `Ves ${seen} (tus 2 y ${deal.board.length} de la mesa): 52 − ${seen} = ${r.unseen}.`,
            ),
            h('li', {},
              h('strong', {}, 'De cabeza. '),
              `${flop ? 'Quedan 2 cartas, así que outs × 4' : 'Queda 1 carta, así que outs × 2'}: ${n} × ${mult} ≈ ${ruleOf2and4(n, r.cardsToCome)}%.`,
            ),
            h('li', {},
              h('strong', {}, 'La cuenta exacta. '),
              `${exactFormula(n, r.unseen, r.cardsToCome)}.`,
            ),
          ),
          !ok && answer === (flop ? n * 2 : n * 4) && h('p', { class: 'small' }, flop
            ? 'Has multiplicado por 2, pero en el flop quedan 2 cartas por salir: hay que multiplicar por 4.'
            : 'Has multiplicado por 4, pero en el turn solo queda 1 carta: hay que multiplicar por 2.'),
          h('a', { class: 'link-btn', href: '#/aprender/probabilidades' }, 'Repasar la lección →'),
        ], next, 'Siguiente'),
      ];
    },
  });
}
