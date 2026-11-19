import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCards } from '../js/engine/cards.js';
import { findOuts, hitChance, ruleOf2and4, flushDrawSuit } from '../js/engine/outs.js';

const outs = (hole, board, minCategory = 4) => findOuts(parseCards(hole), parseCards(board), { minCategory }).outs.length;

test('proyectos clásicos', () => {
  assert.equal(outs('Ah 7h', 'Kh 9h 2c'), 9, 'proyecto de color: 9 outs');
  assert.equal(outs('9c 8d', '7h 6s 2c'), 8, 'escalera abierta: 8 outs');
  assert.equal(outs('9c 8d', '6h 5s Kc'), 4, 'escalera interna (gutshot): 4 outs');
  assert.equal(outs('9h 8h', '7h 6c 2h'), 15, 'color + escalera abierta: 15 outs');
});

test('una mejora que está entera en la mesa no es un out', () => {
  // Mesa con 4 corazones: cualquier corazón da color a todos, salvo que tú tengas un corazón.
  assert.equal(outs('Ac Kd', 'Qh 9h 4h 2h'), 0);
  // Trío en la mesa al salir el tercer 9: no te ayuda a ti.
  const r = findOuts(parseCards('Ac Kd'), parseCards('9s 9h 4c'), { minCategory: 0 });
  assert.ok(!r.outs.some((o) => o.card.rank === 9));
});

test('probabilidades y regla del 2 y del 4', () => {
  assert.ok(Math.abs(hitChance(9, 47, 2) - 0.3497) < 0.001);
  assert.ok(Math.abs(hitChance(9, 46, 1) - 0.1957) < 0.001);
  assert.equal(ruleOf2and4(9, 2), 36);
  assert.equal(ruleOf2and4(9, 1), 18);
});

test('flushDrawSuit', () => {
  assert.equal(flushDrawSuit(parseCards('Ah 7h'), parseCards('Kh 9h 2c')), 'h');
  assert.equal(flushDrawSuit(parseCards('Ac 7d'), parseCards('Kh 9h 2c')), null);
});
