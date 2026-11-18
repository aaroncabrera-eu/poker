// Cartas y baraja.
// Una carta es un objeto { rank, suit }:
//   rank: 2..14  (11 = J, 12 = Q, 13 = K, 14 = A)
//   suit: 's' (picas), 'h' (corazones), 'd' (diamantes), 'c' (tréboles)

export const SUITS = ['s', 'h', 'd', 'c'];
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAMES = { s: 'picas', h: 'corazones', d: 'diamantes', c: 'tréboles' };

const RANK_CHARS = { 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

// Nombre en singular y plural de cada valor ("un Rey", "pareja de Reyes").
export const RANK_NAMES = {
  2: ['Dos', 'Doses'], 3: ['Tres', 'Treses'], 4: ['Cuatro', 'Cuatros'],
  5: ['Cinco', 'Cincos'], 6: ['Seis', 'Seises'], 7: ['Siete', 'Sietes'],
  8: ['Ocho', 'Ochos'], 9: ['Nueve', 'Nueves'], 10: ['Diez', 'Dieces'],
  11: ['Jota', 'Jotas'], 12: ['Reina', 'Reinas'], 13: ['Rey', 'Reyes'],
  14: ['As', 'Ases'],
};

export const rankName = (rank, plural = false) => RANK_NAMES[rank][plural ? 1 : 0];

// Texto corto para mostrar en la carta: "A", "K", "10", "7"...
export const rankLabel = (rank) => (rank === 10 ? '10' : RANK_CHARS[rank] ?? String(rank));

// "Ah" -> { rank: 14, suit: 'h' }. Útil para tests y ejercicios.
export function parseCard(str) {
  const r = str.slice(0, -1).toUpperCase();
  const suit = str.slice(-1).toLowerCase();
  const map = { T: 10, '10': 10, J: 11, Q: 12, K: 13, A: 14 };
  const rank = map[r] ?? Number(r);
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) throw new Error(`Carta inválida: ${str}`);
  return { rank, suit };
}

export const parseCards = (str) => str.trim().split(/\s+/).map(parseCard);

export const cardToString = (c) => (RANK_CHARS[c.rank] ?? String(c.rank)) + c.suit;

// Para mostrar en textos: "10♥", "K♠".
export const cardLabel = (c) => rankLabel(c.rank) + SUIT_SYMBOLS[c.suit];

export const sameCard = (a, b) => a.rank === b.rank && a.suit === b.suit;

export function newDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  return deck;
}

// Barajado Fisher-Yates. `rng` se puede sustituir en los tests para que sea reproducible.
export function shuffle(cards, rng = Math.random) {
  const a = cards.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Baraja con estado: se van sacando cartas de arriba.
export class Deck {
  constructor(rng = Math.random, exclude = []) {
    const remaining = newDeck().filter((c) => !exclude.some((e) => sameCard(c, e)));
    this.cards = shuffle(remaining, rng);
  }
  draw(n = 1) {
    if (n > this.cards.length) throw new Error('No quedan cartas suficientes');
    return this.cards.splice(0, n);
  }
  get size() {
    return this.cards.length;
  }
}
