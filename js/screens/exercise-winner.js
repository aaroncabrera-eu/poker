// Ejercicio: ¿Qué mano gana?
// Se reparten 2 cartas a cada jugador y 5 a la mesa. Eliges ganador y se explica el porqué.

import { h } from '../ui/dom.js';
import { renderCards } from '../ui/cards.js';
import { Deck } from '../engine/cards.js';
import { evaluate, coreCards } from '../engine/hands.js';
import { explainComparison } from '../engine/explain.js';
import { load, save } from '../storage.js';

const STATS_KEY = 'stats:winner';

function makeDeal() {
  for (;;) {
    const deck = new Deck();
    const a = deck.draw(2);
    const b = deck.draw(2);
    const board = deck.draw(5);
    const ha = evaluate([...a, ...board]);
    const hb = evaluate([...b, ...board]);
    // Las manos en las que nadie liga nada son poco interesantes: las hacemos más raras.
    if (ha.category === 0 && hb.category === 0 && Math.random() < 0.8) continue;
    const { result, lines } = explainComparison(ha, hb, 'Jugador A', 'Jugador B');
    return { a, b, board, ha, hb, result, lines };
  }
}

export function winnerExercise() {
  const root = h('section', { class: 'screen exercise' });
  let stats = load(STATS_KEY, { played: 0, correct: 0, streak: 0, best: 0 });
  let deal = makeDeal();
  let answer = null;

  function choose(choice) {
    if (answer) return;
    answer = choice;
    const ok = choice === deal.result;
    stats.played++;
    if (ok) {
      stats.correct++;
      stats.streak++;
      stats.best = Math.max(stats.best, stats.streak);
    } else stats.streak = 0;
    save(STATS_KEY, stats);
    render();
    root.querySelector('.feedback')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function next() {
    deal = makeDeal();
    answer = null;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const seat = (label, cards, hand, key) => {
    const won = answer && (deal.result === key || deal.result === 'tie');
    return h('div', { class: `seat ${answer ? (won ? 'won' : 'lost') : ''}` },
      h('div', { class: 'seat-top' },
        h('div', { class: 'seat-info' },
          h('span', { class: 'seat-name' }, label),
          answer && h('span', { class: 'seat-hand' }, hand.description),
        ),
        renderCards(cards, { size: 'md' }),
      ),
      answer && h('div', { class: 'seat-best' },
        h('span', { class: 'small muted' }, 'Su mejor mano de 5:'),
        renderCards(hand.cards, { size: 'sm', highlight: coreCards(hand), className: 'soft' }),
      ),
    );
  };

  function render() {
    const opts = [['a', 'Gana A'], ['tie', 'Empate'], ['b', 'Gana B']];
    const ok = answer === deal.result;

    const parts = [
      h('div', { class: 'ex-intro' },
        h('p', { class: 'muted' }, 'Cada jugador combina sus 2 cartas con las 5 de la mesa y se queda con las 5 mejores.'),
        h('div', { class: 'stats' },
          h('span', {}, `Aciertos ${stats.correct}/${stats.played}`),
          h('span', {}, `Racha ${stats.streak}`),
          h('span', {}, `Mejor ${stats.best}`),
        ),
      ),
      seat('Jugador A', deal.a, deal.ha, 'a'),
      h('div', { class: 'felt' },
        h('span', { class: 'felt-label' }, 'Mesa · board'),
        renderCards(deal.board, { size: 'board' }),
      ),
      seat('Jugador B', deal.b, deal.hb, 'b'),
      h('div', { class: 'answers' },
        opts.map(([key, text]) =>
          h('button', {
            class: ['btn', 'answer',
              answer && key === deal.result && 'correct',
              answer && key === answer && !ok && 'wrong'].filter(Boolean).join(' '),
            disabled: !!answer,
            onClick: () => choose(key),
          }, text),
        ),
      ),
      answer && h('div', { class: `feedback ${ok ? 'ok' : 'bad'}` },
        h('strong', { class: 'fb-title' }, ok ? '¡Correcto!' : 'No exactamente'),
        deal.lines.map((l) => h('p', {}, l)),
        h('button', { class: 'btn primary', onClick: next }, 'Siguiente mano'),
      ),
    ];
    root.replaceChildren(...parts.filter(Boolean));
  }

  render();
  return root;
}
