// Calculadora: probabilidades exactas (por simulación) y cómo calcularlas de cabeza.

import { h } from '../ui/dom.js';
import { renderCard, renderSlot } from '../ui/cards.js';
import { SUITS, RANKS, SUIT_SYMBOLS, rankLabel, sameCard, Deck } from '../engine/cards.js';
import { evaluate } from '../engine/hands.js';
import { estimateEquity } from '../engine/equity.js';
import { findOuts } from '../engine/outs.js';
import { describeHole } from '../engine/coach.js';
import { outsExplanation } from '../ui/outs-view.js';
import { load, save } from '../storage.js';

const pct = (x) => `${Math.round(x * 100)}%`;

export function calculatorScreen() {
  const root = h('section', { class: 'screen calc' });
  const slots = Array(7).fill(null); // 0-1: tus cartas, 2-6: mesa
  let active = 0;
  const prefs = load('settings:calc', { opponents: 1 });
  let calcId = 0;

  const used = (c) => slots.some((s) => s && sameCard(s, c));
  const hole = () => slots.slice(0, 2).filter(Boolean);
  const board = () => slots.slice(2).filter(Boolean);

  function nextEmpty(from) {
    for (let k = 0; k < 7; k++) {
      const i = (from + k) % 7;
      if (!slots[i]) return i;
    }
    return -1;
  }

  function pick(c) {
    if (active < 0 || used(c)) return;
    slots[active] = c;
    active = nextEmpty(active + 1);
    render();
  }

  function tapSlot(i) {
    slots[i] = null;
    active = i;
    render();
  }

  function random() {
    slots.fill(null);
    const d = new Deck();
    const cards = d.draw(5);
    cards.forEach((c, i) => (slots[i] = c));
    active = 5;
    render();
  }

  function slotView(i) {
    const c = slots[i];
    const cls = `slot-btn ${i === active ? 'active' : ''}`;
    return h('button', { class: cls, onClick: () => tapSlot(i), 'aria-label': c ? 'Quitar carta' : 'Elegir esta posición' },
      c ? renderCard(c) : renderSlot());
  }

  function picker() {
    return h('div', { class: 'picker', role: 'grid', 'aria-label': 'Elige una carta' },
      SUITS.map((s) => h('div', { class: `picker-row suit-${s}`, role: 'row' },
        [...RANKS].reverse().map((r) => {
          const c = { rank: r, suit: s };
          const u = used(c);
          return h('button', { class: `pick suit-${s}`, disabled: u || active < 0, onClick: () => pick(c), 'aria-label': `${rankLabel(r)} ${s}` },
            h('span', {}, rankLabel(r)), h('span', { class: 'pick-suit' }, SUIT_SYMBOLS[s]));
        }))));
  }

  function opponentsPicker() {
    return h('div', { class: 'seg' },
      [1, 2, 3, 4, 5].map((n) => h('button', {
        class: `seg-btn ${prefs.opponents === n ? 'on' : ''}`,
        onClick: () => { prefs.opponents = n; save('settings:calc', prefs); render(); },
      }, String(n))));
  }

  function results() {
    const hc = hole();
    const bc = board();
    if (hc.length < 2) return h('p', { class: 'muted calc-empty' }, 'Elige tus 2 cartas para empezar. Puedes añadir 3, 4 o 5 cartas de mesa.');
    if (bc.length === 1 || bc.length === 2) return h('p', { class: 'muted calc-empty' }, 'La mesa se reparte de 3 en 3 al principio (el flop): pon al menos 3 cartas o ninguna.');

    const box = h('div', { class: 'calc-results' }, h('p', { class: 'muted' }, 'Calculando…'));
    const id = ++calcId;
    setTimeout(() => {
      if (id !== calcId || !root.isConnected) return;
      const n = prefs.opponents;
      const eq = estimateEquity(hc, bc, n, { iterations: n > 2 ? 3000 : 5000 });
      const lose = Math.max(0, 1 - eq.win - eq.tie);
      const parts = [];
      parts.push(h('p', { class: 'calc-hand' }, bc.length ? `Tu mano ahora: ${evaluate([...hc, ...bc]).description}` : `Tus cartas: ${describeHole(hc)}`));
      parts.push(h('div', { class: 'eqbar', role: 'img', 'aria-label': `Ganas ${pct(eq.win)}, empatas ${pct(eq.tie)}, pierdes ${pct(lose)}` },
        h('span', { class: 'eq-win', style: { width: `${eq.win * 100}%` } }),
        h('span', { class: 'eq-tie', style: { width: `${eq.tie * 100}%` } }),
        h('span', { class: 'eq-lose', style: { width: `${lose * 100}%` } }),
      ));
      parts.push(h('div', { class: 'eq-legend' },
        h('span', { class: 'lg-win' }, `Ganas ${pct(eq.win)}`),
        h('span', { class: 'lg-tie' }, `Empatas ${pct(eq.tie)}`),
        h('span', { class: 'lg-lose' }, `Pierdes ${pct(lose)}`),
      ));
      const fair = 1 / (n + 1);
      parts.push(h('p', {}, `Si esta situación se repitiera 100 veces contra ${n === 1 ? '1 rival' : `${n} rivales`} con cartas al azar, ganarías unas ${Math.round(eq.win * 100)}. Lo "normal" con ${n + 1} jugadores sería ${pct(fair)}: tu mano está ${eq.equity > fair * 1.15 ? 'por encima' : eq.equity < fair * 0.85 ? 'por debajo' : 'más o menos en la media'}.`));

      if (bc.length === 3 || bc.length === 4) {
        const r = findOuts(hc, bc);
        parts.push(h('h3', { class: 'calc-h' }, `Outs: ${r.outs.length}`));
        parts.push(h('p', { class: 'small muted' }, 'Cartas que mejoran tu mano (sin contar mejoras que están solo en la mesa). Ojo: mejorar no siempre es ganar, un rival también puede mejorar.'));
        parts.push(outsExplanation(hc, bc, r));
      } else if (bc.length === 0) {
        parts.push(h('p', { class: 'small muted' }, 'Antes del flop no se cuentan outs: todavía faltan las 5 cartas de la mesa. Las parejas y las cartas altas son las manos que más ganan.'));
      } else {
        parts.push(h('p', { class: 'small muted' }, 'En el river ya no quedan cartas por salir: lo que tienes es lo que hay.'));
      }
      box.replaceChildren(...parts);
    }, 30);
    return box;
  }

  function render() {
    root.replaceChildren(
      h('p', { class: 'muted lead' }, 'Toca un hueco y luego una carta. Toca una carta puesta para quitarla.'),
      h('div', { class: 'calc-slots' },
        h('div', { class: 'calc-group' }, h('span', { class: 'felt-label' }, 'Tus cartas'), h('div', { class: 'slot-row' }, slotView(0), slotView(1))),
        h('div', { class: 'calc-group board-group' }, h('span', { class: 'felt-label' }, 'Mesa'), h('div', { class: 'slot-row' }, [2, 3, 4, 5, 6].map(slotView))),
      ),
      picker(),
      h('div', { class: 'calc-tools' },
        h('button', { class: 'btn chip', onClick: () => { slots.fill(null); active = 0; render(); } }, 'Limpiar'),
        h('button', { class: 'btn chip', onClick: random }, 'Al azar'),
      ),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Rivales'), opponentsPicker()),
      results(),
    );
  }

  render();
  return root;
}
