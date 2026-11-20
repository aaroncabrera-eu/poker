import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/engine/game.js';
import { decideBot } from '../js/engine/bots.js';
import { advise, describeHole } from '../js/engine/coach.js';
import { parseCards } from '../js/engine/cards.js';

test('mesas solo de bots juegan muchas manos sin errores y sin perder fichas', () => {
  for (const level of ['easy', 'normal']) {
    const g = new Game({ players: Array.from({ length: 4 }, (_, i) => ({ name: `B${i}`, level })) });
    for (let h = 0; h < 60; h++) {
      g.startHand();
      const total = g.players.reduce((s, p) => s + p.stack + p.totalBet, 0);
      while (g.phase !== 'hand-over') {
        if (g.phase === 'street-end') g.next();
        else g.act(decideBot(g, g.current.level));
      }
      assert.equal(g.players.reduce((s, p) => s + p.stack, 0), total);
    }
  }
});

test('el entrenador da una recomendación válida', () => {
  const g = new Game({ players: [{ name: 'Tú', isHuman: true }, { name: 'B' }], button: 0 });
  g.startHand();
  while (g.phase !== 'hand-over') {
    if (g.phase === 'street-end') { g.next(); continue; }
    const a = advise(g);
    assert.ok(['fold', 'call', 'check', 'raise', 'bet'].includes(a.rec));
    assert.ok(a.lines.length >= 2 && a.why);
    g.act({ type: g.legalActions().canCheck ? 'check' : 'call' });
  }
});

test('describeHole', () => {
  assert.equal(describeHole(parseCards('Kh Kd')), 'Pareja de mano (pocket pair) de Reyes');
  assert.equal(describeHole(parseCards('Js Qs')), 'Reina y Jota del mismo palo (suited), seguidas (connectors)');
  assert.equal(describeHole(parseCards('Ah 7d')), 'As y Siete de distinto palo (offsuit)');
});

test('judgeAction valora las jugadas', async () => {
  const { judgeAction } = await import('../js/engine/coach.js');
  const base = { equity: 0.2, potOdds: 0.3, isBet: false };
  assert.equal(judgeAction({ ...base, rec: 'fold' }, { type: 'fold' }).grade, 'good');
  assert.equal(judgeAction({ ...base, rec: 'fold' }, { type: 'call' }).grade, 'bad');
  assert.equal(judgeAction({ equity: 0.6, potOdds: 0.25, rec: 'call' }, { type: 'fold' }).grade, 'bad');
  assert.equal(judgeAction({ equity: 0.3, potOdds: 0.25, rec: 'call' }, { type: 'fold' }).grade, 'ok');
  assert.equal(judgeAction({ equity: 0.3, potOdds: 0, rec: 'check', isBet: true }, { type: 'raise' }).grade, 'ok');
  assert.equal(judgeAction({ equity: 0.3, potOdds: 0, rec: 'check', isBet: true }, { type: 'fold' }).grade, 'bad');
});
