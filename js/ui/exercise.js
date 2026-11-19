// Piezas comunes de los ejercicios: marcador guardado y caja de respuesta.

import { h } from './dom.js';
import { load, save } from '../storage.js';

export function createStats(key) {
  const stats = load(key, { played: 0, correct: 0, streak: 0, best: 0 });
  return {
    record(ok) {
      stats.played++;
      if (ok) {
        stats.correct++;
        stats.streak++;
        stats.best = Math.max(stats.best, stats.streak);
      } else stats.streak = 0;
      save(key, stats);
    },
    bar: () =>
      h('div', { class: 'stats' },
        h('span', {}, `Aciertos ${stats.correct}/${stats.played}`),
        h('span', {}, `Racha ${stats.streak}`),
        h('span', {}, `Mejor ${stats.best}`),
      ),
  };
}

export function feedbackBox(ok, content, onNext, nextLabel = 'Siguiente') {
  return h('div', { class: `feedback ${ok ? 'ok' : 'bad'}` },
    h('strong', { class: 'fb-title' }, ok ? '¡Correcto!' : 'No exactamente'),
    content,
    h('button', { class: 'btn primary', onClick: onNext }, nextLabel),
  );
}

// Monta un ejercicio con estado { deal, answer } y una función render(deal, answer, choose) -> nodos.
export function runExercise({ statsKey, makeDeal, isCorrect, render }) {
  const root = h('section', { class: 'screen exercise' });
  const stats = createStats(statsKey);
  let deal = makeDeal();
  let answer = null;

  const choose = (a) => {
    if (answer !== null) return;
    answer = a;
    stats.record(isCorrect(deal, a));
    draw();
    root.querySelector('.feedback')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const next = () => {
    deal = makeDeal();
    answer = null;
    draw();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  function draw() {
    root.replaceChildren(...[render({ deal, answer, choose, next, stats })].flat(Infinity).filter(Boolean));
  }
  draw();
  return root;
}

export const pct = (x) => `${Math.round(x * 100)}%`;

export function shuffleArr(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
