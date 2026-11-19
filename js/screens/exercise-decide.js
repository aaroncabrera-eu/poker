// Ejercicio: ¿Qué harías? Un rival apuesta; decide si pagar o retirarte según tus probabilidades y las pot odds.

import { h } from '../ui/dom.js';
import { renderCards } from '../ui/cards.js';
import { Deck } from '../engine/cards.js';
import { evaluate } from '../engine/hands.js';
import { estimateEquity } from '../engine/equity.js';
import { findOuts, ruleOf2and4 } from '../engine/outs.js';
import { runExercise, feedbackBox, pct } from '../ui/exercise.js';

const FRACTIONS = [[1 / 3, 'un tercio del bote'], [1 / 2, 'medio bote'], [2 / 3, 'dos tercios del bote'], [1, 'el bote entero'], [1.5, 'bote y medio']];

function makeDeal() {
  for (;;) {
    const d = new Deck();
    const hole = d.draw(2);
    const board = d.draw([3, 4, 5][Math.floor(Math.random() * 3)]);
    const before = 40 + 10 * Math.floor(Math.random() * 27); // 40..300
    const [frac, fracName] = FRACTIONS[Math.floor(Math.random() * FRACTIONS.length)];
    const bet = Math.max(10, Math.round((before * frac) / 5) * 5);
    const potOdds = bet / (before + 2 * bet);
    const { equity } = estimateEquity(hole, board, 1, { iterations: 2500 });
    if (Math.abs(equity - potOdds) < 0.1) continue; // solo situaciones claras
    return { hole, board, before, bet, fracName, potOdds, equity, correct: equity > potOdds ? 'call' : 'fold' };
  }
}

export function decideExercise() {
  return runExercise({
    statsKey: 'stats:decide',
    makeDeal,
    isCorrect: (deal, a) => a === deal.correct,
    render: ({ deal, answer, choose, next, stats }) => {
      const done = answer !== null;
      const ok = answer === deal.correct;
      const streets = { 3: 'flop', 4: 'turn', 5: 'river' };
      const street = streets[deal.board.length];
      const hand = evaluate([...deal.hole, ...deal.board]);
      const potNow = deal.before + deal.bet;

      let outsLine = null;
      if (deal.board.length < 5) {
        const r = findOuts(deal.hole, deal.board, { minCategory: Math.max(hand.category + 1, 2) });
        if (r.outs.length > 0) {
          const n = r.outs.length;
          outsLine = `De cabeza: tienes unos ${n} outs para mejorar. Con la regla del ${r.cardsToCome === 2 ? 4 : 2}, ${n} × ${r.cardsToCome === 2 ? 4 : 2} ≈ ${ruleOf2and4(n, r.cardsToCome)}% de ligar algo mejor.`;
        }
      }

      const opt = (key, label, en) => h('button', {
        class: ['btn', 'act', done && key === deal.correct && 'correct', done && key === answer && !ok && 'wrong'].filter(Boolean).join(' '),
        disabled: done,
        onClick: () => choose(key),
      }, h('span', {}, label), h('span', { class: 'en' }, en));

      return [
        h('div', { class: 'ex-intro' },
          h('p', { class: 'muted' }, `Estás en el ${street} contra un solo rival. Apuesta ${deal.fracName}. ¿Pagas o te retiras?`),
          stats.bar(),
        ),
        h('div', { class: 'seat' },
          h('div', { class: 'seat-top' },
            h('div', { class: 'seat-info' },
              h('span', { class: 'seat-name' }, 'Tus cartas'),
              h('span', { class: 'seat-hand' }, `Tienes: ${hand.description}`),
            ),
            renderCards(deal.hole, { size: 'md' }),
          ),
        ),
        h('div', { class: 'felt' },
          h('div', { class: 'felt-top' },
            h('span', { class: 'felt-label' }, `Mesa · ${street}`),
            h('span', { class: 'pot' }, 'Bote ', h('strong', {}, potNow)),
          ),
          renderCards([...deal.board, ...Array(5 - deal.board.length).fill(null)], { size: 'board', empty: 'slot' }),
          h('p', { class: 'felt-note' }, `El rival apuesta ${deal.bet} (ya está dentro del bote de ${potNow}).`),
        ),
        h('div', { class: 'actions' },
          opt('fold', 'Retirarse', 'fold'),
          opt('call', `Pagar ${deal.bet}`, 'call'),
        ),
        done && feedbackBox(ok, [
          h('p', {}, `Contra una mano cualquiera ganarías más o menos el ${pct(deal.equity)} de las veces.`),
          h('p', {}, `Para pagar pones ${deal.bet} y el bote quedaría en ${potNow + deal.bet}. Necesitas ganar al menos ${deal.bet} / ${potNow + deal.bet} = ${pct(deal.potOdds)} de las veces.`),
          h('p', { class: 'why' }, deal.correct === 'call'
            ? `Como ${pct(deal.equity)} es más que ${pct(deal.potOdds)}, pagar sale rentable a la larga.`
            : `Como ${pct(deal.equity)} es menos que ${pct(deal.potOdds)}, pagar te haría perder fichas a la larga: mejor retirarse.`),
          outsLine && h('p', { class: 'small' }, outsLine),
          h('p', { class: 'small muted' }, 'Simplificación: suponemos que el rival puede tener cualquier mano. En la realidad, quien apuesta fuerte suele tener algo, así que conviene ser algo más prudente.'),
        ], next, 'Siguiente'),
      ];
    },
  });
}
