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

test('exactFormula escribe la cuenta y cuadra', async () => {
  const { exactFormula } = await import('../js/engine/outs.js');
  assert.equal(exactFormula(9, 46, 1), '9 outs entre 46 cartas = 9/46 = 20%');
  assert.equal(exactFormula(9, 47, 2), 'fallar las dos cartas = 38/47 × 37/46 = 65%, así que ligar = 100% − 65% = 35%');
});

test('las cartas que solo emparejan la mesa no son outs (caso 10-10 en 7-8-J)', async () => {
  const { findOuts, outsBreakdown } = await import('../js/engine/outs.js');
  const hole = parseCards('Tc Ts');
  const board = parseCards('7h 8h Jd');
  const r = findOuts(hole, board, { minCategory: 2 });
  assert.equal(r.outs.length, 6, '2 Dieces (trío) + 4 Nueves (escalera)');
  assert.equal(r.shared.length, 9, 'los 7, 8 y J solo emparejan la mesa');
  const text = outsBreakdown(hole, board, r).join('\n');
  assert.match(text, /Trío: los 2 Dieces que quedan → 2 cartas/);
  assert.match(text, /Escalera: cualquier Nueve \(hay 4, uno de cada palo\) → 4 cartas/);
  assert.match(text, /Total: 4 \+ 2 = 6 outs|Total: 2 \+ 4 = 6 outs/);
  assert.match(text, /No cuentan/);
  assert.match(text, /× 4/);
});

test('de trío a full emparejando la mesa sí cuenta', async () => {
  const { findOuts } = await import('../js/engine/outs.js');
  // Trío de 5 (pareja en mano): si sale un 9 o un K, full.
  const r = findOuts(parseCards('5c 5d'), parseCards('5h 9s Kd'), { minCategory: 4 });
  assert.ok(r.outs.some((o) => o.card.rank === 9 && o.hand.category === 6));
});

test('femenino: las Jotas, las Reinas', async () => {
  const { findOuts, outsBreakdown } = await import('../js/engine/outs.js');
  const r = findOuts(parseCards('Qc Qs'), parseCards('2h 7d 9c'), { minCategory: 3 });
  assert.match(outsBreakdown(parseCards('Qc Qs'), parseCards('2h 7d 9c'), r).join(' '), /las 2 Reinas que quedan/);
});
