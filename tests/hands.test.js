import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCards, newDeck, Deck, cardToString } from '../js/engine/cards.js';
import { evaluate, evaluate5, compareHands, findWinners, CATEGORIES } from '../js/engine/hands.js';

const ev = (s) => evaluate(parseCards(s));
const beats = (a, b) => compareHands(ev(a), ev(b));

test('reconoce cada categoría', () => {
  assert.equal(ev('Ah Jd 8c 5s 2h').description, 'Carta alta: As');
  assert.equal(ev('Kh Kd 9c 6s 3h').description, 'Pareja de Reyes');
  assert.equal(ev('Qh Qc 7d 7s Ah').description, 'Doble pareja de Reinas y Sietes');
  assert.equal(ev('8s 8h 8d Kc 4s').description, 'Trío de Ochos');
  assert.equal(ev('9c 8d 7h 6s 5c').description, 'Escalera al Nueve');
  assert.equal(ev('Ah Jh 9h 4h 2h').description, 'Color al As');
  assert.equal(ev('10s 10h 10d 4c 4s').description, 'Full de Dieces con Cuatros');
  assert.equal(ev('5s 5h 5d 5c Ks').description, 'Póker de Cincos');
  assert.equal(ev('9s 8s 7s 6s 5s').description, 'Escalera de color al Nueve');
  assert.equal(ev('As Ks Qs Js Ts').description, 'Escalera real');
});

test('los ejemplos de la chuleta tienen la categoría que dicen', () => {
  for (const cat of CATEGORIES) assert.equal(ev(cat.example).category, cat.id, cat.name);
});

test('escalera baja A-2-3-4-5 (el As vale 1)', () => {
  const h = ev('Ah 2d 3c 4s 5h');
  assert.equal(h.description, 'Escalera al Cinco');
  assert.equal(h.cards.map(cardToString).join(' '), '5h 4s 3c 2d Ah');
  assert.ok(beats('2h 3d 4c 5s 6h', 'Ah 2d 3c 4s 5h') > 0, '6 alta gana a la rueda');
  assert.equal(ev('Qh Kd Ac 2s 3h').category, 0, 'Q-K-A-2-3 no es escalera');
});

test('desempates (kickers)', () => {
  assert.ok(beats('Ah Ad Kc 7s 2h', 'As Ac Qd 7h 2c') > 0, 'pareja de ases, gana el kicker K');
  assert.ok(beats('Kh Kd 2c 2s 9h', 'Qh Qd Jc Js Ah') > 0, 'doble pareja: manda la pareja alta');
  assert.ok(beats('Ah Jh 9h 4h 3h', 'Ad Jd 9d 4d 2d') > 0, 'color: se compara carta a carta');
  assert.ok(beats('3h 3d 3c Ks Kh', '2h 2d 2c As Ah') > 0, 'full: manda el trío');
  assert.equal(beats('Ah Kd Qc Js 9h', 'Ad Kc Qh Jd 9s'), 0, 'mismas cartas de otro palo = empate');
});

test('con 7 cartas elige la mejor combinación de 5', () => {
  // Hay color y escalera: el color es mejor.
  const h = ev('Ah 9h 5h 6d 7h 8c 2h');
  assert.equal(h.name, 'Color');
  assert.equal(h.cards.length, 5);
  // Dos tríos: es un full.
  assert.equal(ev('Kh Kd Kc 4s 4h 4d 9c').description, 'Full de Reyes con Cuatros');
  // Escalera de 6 cartas seguidas: cuenta la más alta.
  assert.equal(ev('4h 5d 6c 7s 8h 9d Kc').description, 'Escalera al Nueve');
});

test('findWinners detecta botes repartidos', () => {
  const board = parseCards('As Ks Qs Js Ts');
  const { winners } = findWinners([parseCards('2h 3d'), parseCards('4c 5c')], board);
  assert.deepEqual(winners, [0, 1], 'escalera real en la mesa: empate');

  const board2 = parseCards('Kh 9d 5c 2s 2h');
  const r = findWinners([parseCards('Kd Qc'), parseCards('Kc Jh'), parseCards('9h 9c')], board2);
  assert.deepEqual(r.winners, [2], 'el full de nueves gana');
});

test('la baraja tiene 52 cartas distintas y Deck reparte sin repetir', () => {
  const all = newDeck().map(cardToString);
  assert.equal(new Set(all).size, 52);
  const d = new Deck();
  const drawn = d.draw(52).map(cardToString);
  assert.equal(new Set(drawn).size, 52);
  assert.throws(() => d.draw());
  const excl = new Deck(Math.random, parseCards('Ah Kh'));
  assert.equal(excl.size, 50);
});

test('frecuencias de las 2.598.960 manos de 5 cartas', () => {
  const expected = [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40];
  const counts = Array(9).fill(0);
  const d = newDeck();
  for (let a = 0; a < 48; a++)
    for (let b = a + 1; b < 49; b++)
      for (let c = b + 1; c < 50; c++)
        for (let e = c + 1; e < 51; e++)
          for (let f = e + 1; f < 52; f++)
            counts[evaluate5([d[a], d[b], d[c], d[e], d[f]]).category]++;
  assert.deepEqual(counts, expected);
});
