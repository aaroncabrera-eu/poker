import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../js/engine/game.js';
import { parseCards } from '../js/engine/cards.js';
import { estimateEquity } from '../js/engine/equity.js';

// Generador aleatorio con semilla, para que los tests sean reproducibles.
function seeded(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mk = (n, opts = {}) =>
  new Game({ players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, stack: opts.stacks?.[i] })), button: 0, rng: seeded(1), ...opts });

// Fija las cartas: holes = ['Ah Ad', ...], board = 'Kc 7d 2s 9h 3c'
function rig(g, holes, board) {
  holes.forEach((h, i) => (g.players[i].hole = parseCards(h)));
  g.deck.cards = parseCards(board);
}

test('heads-up: el botón pone la ciega pequeña y habla primero preflop, último después', () => {
  const g = mk(2);
  g.startHand();
  assert.equal(g.button, 0);
  assert.equal(g.sbIndex, 0);
  assert.equal(g.bbIndex, 1);
  assert.equal(g.players[0].bet, 5);
  assert.equal(g.players[1].bet, 10);
  assert.equal(g.toAct, 0);
  g.act({ type: 'call' });
  assert.equal(g.toAct, 1, 'la ciega grande tiene opción');
  g.act({ type: 'check' });
  assert.equal(g.phase, 'street-end');
  g.next();
  assert.equal(g.street, 'flop');
  assert.equal(g.board.length, 3);
  assert.equal(g.toAct, 1, 'después del flop habla primero la ciega grande');
});

test('3 jugadores: empieza el de la izquierda de la ciega grande', () => {
  const g = mk(3);
  g.startHand();
  assert.deepEqual([g.button, g.sbIndex, g.bbIndex, g.toAct], [0, 1, 2, 0]);
  g.act({ type: 'call' });
  g.act({ type: 'call' });
  assert.equal(g.toAct, 2);
  assert.ok(g.legalActions().canRaise, 'la ciega grande puede subir');
  g.act({ type: 'check' });
  g.next();
  assert.equal(g.toAct, 1, 'postflop empieza la ciega pequeña');
  assert.equal(g.pot, 30);
});

test('si todos se retiran, el último gana sin showdown', () => {
  const g = mk(3);
  g.startHand();
  g.act({ type: 'raise', amount: 30 });
  g.act({ type: 'fold' });
  g.act({ type: 'fold' });
  assert.equal(g.phase, 'hand-over');
  assert.ok(g.result.uncontested);
  assert.equal(g.players[0].stack, 1015);
  assert.equal(g.players[1].stack, 995);
  assert.equal(g.players[2].stack, 990);
});

test('subida mínima y all-in corto que no reabre la acción', () => {
  const g = mk(3, { stacks: [1000, 1000, 45] });
  g.startHand(); // botón 0, SB 1, BB 2 (45 fichas)
  const la = g.legalActions();
  assert.equal(la.minRaiseTo, 20, 'mínimo: el doble de la ciega grande');
  g.act({ type: 'raise', amount: 30 }); // P0 sube a 30 (subida de 20)
  assert.equal(g.legalActions().minRaiseTo, 50, 'la siguiente subida mínima es 30 + 20');
  g.act({ type: 'call' }); // P1 iguala 30
  g.act({ type: 'raise', amount: 45 }); // P2 all-in a 45: solo sube 15, no es subida completa
  assert.equal(g.toAct, 0);
  assert.equal(g.legalActions().canRaise, false, 'P0 ya actuó y el all-in corto no reabre');
  g.act({ type: 'call' });
  assert.equal(g.legalActions().canRaise, false);
  g.act({ type: 'call' });
  assert.equal(g.phase, 'street-end');
  assert.equal(g.pot, 135);
});

test('botes secundarios', () => {
  // P0 tiene 100, P1 300, P2 300. Todos all-in.
  const g = mk(3, { stacks: [100, 300, 300] });
  g.startHand();
  rig(g, ['Ah Ad', 'Kh Kd', 'Qh Qd'], '2c 7s 9d 3h 4s');
  g.act({ type: 'raise', amount: 100 }); // P0 all-in
  g.act({ type: 'raise', amount: 300 }); // P1 all-in
  g.act({ type: 'call' }); // P2 all-in
  while (g.phase !== 'hand-over') g.next();
  // Bote principal 300 (3 x 100) -> P0 (ases). Secundario 400 (2 x 200) -> P1 (reyes).
  assert.deepEqual(g.result.pots.map((p) => [p.amount, p.winners]), [[300, [0]], [400, [1]]]);
  assert.deepEqual(g.players.map((p) => p.stack), [300, 400, 0]);
});

test('apuesta no igualada se devuelve y empate reparte', () => {
  const g = mk(2, { stacks: [1000, 200] });
  g.startHand();
  rig(g, ['Ah Kd', 'As Kc'], '2c 7s 9d 3h 4s');
  g.act({ type: 'raise', amount: 1000 });
  g.act({ type: 'call' });
  while (g.phase !== 'hand-over') g.next();
  assert.deepEqual(g.players.map((p) => p.stack), [1000, 200], 'empate exacto + devolución de lo no igualado');
});

test('2000 manos al azar: nunca se crean ni se pierden fichas', () => {
  const rng = seeded(42);
  for (const n of [2, 3, 6]) {
    const g = new Game({ players: Array.from({ length: n }, (_, i) => ({ name: `P${i}` })), rng });
    for (let hand = 0; hand < 2000 / 3; hand++) {
      g.startHand();
      const total = g.players.reduce((s, p) => s + p.stack + p.totalBet, 0);
      let guard = 0;
      while (g.phase !== 'hand-over') {
        if (++guard > 200) throw new Error('la mano no termina');
        if (g.phase === 'street-end') {
          g.next();
          continue;
        }
        const la = g.legalActions();
        const r = rng();
        if (la.canRaise && r < 0.25) {
          const amt = la.minRaiseTo + Math.floor(rng() * (la.maxRaiseTo - la.minRaiseTo + 1));
          g.act({ type: 'raise', amount: amt });
        } else if (r < 0.4 && la.canCall) g.act({ type: 'fold' });
        else g.act({ type: la.canCheck ? 'check' : 'call' });
      }
      const after = g.players.reduce((s, p) => s + p.stack, 0);
      assert.equal(after, total, `mano ${hand}: fichas antes ${total}, después ${after}`);
      assert.ok(g.players.every((p) => p.stack >= 0));
    }
  }
});

test('equity: valores conocidos', () => {
  const rng = seeded(7);
  const aa = estimateEquity(parseCards('Ah Ad'), [], 1, { iterations: 6000, rng }).equity;
  assert.ok(Math.abs(aa - 0.852) < 0.025, `AA vs 1: ${aa}`);
  const sevenTwo = estimateEquity(parseCards('7h 2d'), [], 1, { iterations: 6000, rng }).equity;
  assert.ok(Math.abs(sevenTwo - 0.346) < 0.025, `72o vs 1: ${sevenTwo}`);
  // Escalera real en la mesa: siempre empate.
  const r = estimateEquity(parseCards('2c 3d'), parseCards('As Ks Qs Js Ts'), 2, { iterations: 200, rng });
  assert.equal(r.win, 0);
  assert.equal(r.tie, 1);
  assert.ok(Math.abs(r.equity - 1 / 3) < 1e-9);
});
