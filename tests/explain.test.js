import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCards } from '../js/engine/cards.js';
import { evaluate } from '../js/engine/hands.js';
import { explainComparison } from '../js/engine/explain.js';

const ex = (a, b) => explainComparison(evaluate(parseCards(a)), evaluate(parseCards(b)));

test('categorías distintas', () => {
  const r = ex('Kh Kd Kc 4s 2h', 'Ah Ad 9c 6s 3h');
  assert.equal(r.result, 'a');
  assert.match(r.lines[1], /Trío gana a pareja/);
});

test('misma pareja, decide el kicker', () => {
  const r = ex('Ah Ad Kc 7s 2h', 'As Ac Qd 7h 2c');
  assert.equal(r.result, 'a');
  assert.match(r.lines[1], /desempata la carta acompañante \(kicker\): Rey gana a Reina/);
});

test('segundo kicker', () => {
  const r = ex('Ah Ad Kc 7s 2h', 'As Ac Kd 8h 2c');
  assert.equal(r.result, 'b');
  assert.match(r.lines[1], /segunda carta acompañante/);
});

test('full: decide el trío', () => {
  const r = ex('3h 3d 3c Ks Kh', '2h 2d 2c As Ah');
  assert.match(r.lines[1], /trío de Treses gana a trío de Doses/);
});

test('empate', () => {
  const r = ex('Ah Kd Qc Js 9h', 'Ad Kc Qh Jd 9s');
  assert.equal(r.result, 'tie');
  assert.match(r.lines[1], /se reparten el bote/);
});
