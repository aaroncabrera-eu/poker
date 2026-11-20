// Motor de una partida de Texas Hold'em sin límite (No Limit).
// No sabe nada de la pantalla: la interfaz le pide avanzar paso a paso.
//
// Fases (game.phase):
//   'betting'    -> esperando la acción de players[toAct]  (act())
//   'street-end' -> ronda de apuestas cerrada; next() reparte la siguiente calle o va al showdown
//   'hand-over'  -> mano terminada; resultado en game.result. startHand() empieza otra.

import { Deck, cardLabel } from './cards.js';
import { evaluate, compareHands } from './hands.js';

export const STREET_NAMES = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };
const NEXT_STREET = { preflop: 'flop', flop: 'turn', turn: 'river' };
const CARDS_PER_STREET = { flop: 3, turn: 1, river: 1 };

// "Zorro iguala 10" / "Igualas 10": el texto cambia si el jugador eres tú.
const say = (p, third, second) => (p.isHuman ? second : `${p.name} ${third}`);
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export class Game {
  constructor({ players, smallBlind = 5, bigBlind = 10, startingStack = 1000, rng = Math.random, button } = {}) {
    if (players.length < 2) throw new Error('Hacen falta al menos 2 jugadores');
    this.players = players.map((p, i) => ({
      id: i,
      name: p.name,
      isHuman: !!p.isHuman,
      level: p.level,
      stack: p.stack ?? startingStack,
      hole: [],
      bet: 0, // apostado en esta calle
      totalBet: 0, // apostado en toda la mano
      folded: false,
      allIn: false,
      hasActed: false,
      actedAt: -1,
      lastAction: null,
    }));
    this.sb = smallBlind;
    this.bb = bigBlind;
    this.startingStack = startingStack;
    this.rng = rng;
    // startHand() mueve el botón una posición antes de empezar.
    this.button = (button ?? Math.floor(rng() * players.length)) - 1;
    this.handNumber = 0;
    this.phase = 'idle';
    this.log = [];
    this.board = [];
    this.result = null;
  }

  // ---------- utilidades ----------
  get pot() {
    return this.players.reduce((s, p) => s + p.totalBet, 0);
  }
  get human() {
    return this.players.find((p) => p.isHuman);
  }
  get current() {
    return this.phase === 'betting' ? this.players[this.toAct] : null;
  }
  get livePlayers() {
    return this.players.filter((p) => !p.folded);
  }

  canAct(p) {
    return !p.folded && !p.allIn;
  }

  nextIndex(from, pred = () => true) {
    const n = this.players.length;
    for (let k = 1; k <= n; k++) {
      const i = (((from + k) % n) + n) % n;
      if (pred(this.players[i])) return i;
    }
    return -1;
  }

  emit(type, text, extra = {}) {
    this.log.push({ type, text, street: this.street, ...extra });
  }

  put(p, amount) {
    const a = Math.min(amount, p.stack);
    p.stack -= a;
    p.bet += a;
    p.totalBet += a;
    if (p.stack === 0) p.allIn = true;
    return a;
  }

  // ---------- inicio de mano ----------
  startHand() {
    this.handNumber++;
    this.log = [];
    this.board = [];
    this.result = null;
    this.deck = new Deck(this.rng);

    for (const p of this.players) {
      if (p.stack === 0) {
        p.stack = this.startingStack;
        this.emit('info', say(p, `se había quedado sin fichas y recarga ${this.startingStack}.`, `Te habías quedado sin fichas: recargas ${this.startingStack}.`), { player: p.id });
      }
      Object.assign(p, { hole: [], bet: 0, totalBet: 0, folded: false, allIn: false, hasActed: false, actedAt: -1, lastAction: null });
    }

    this.street = 'preflop';
    this.button = this.nextIndex(this.button);
    const headsUp = this.players.length === 2;
    this.sbIndex = headsUp ? this.button : this.nextIndex(this.button);
    this.bbIndex = this.nextIndex(this.sbIndex);

    const sbP = this.players[this.sbIndex];
    const bbP = this.players[this.bbIndex];
    const sbAmt = this.put(sbP, this.sb);
    const bbAmt = this.put(bbP, this.bb);
    this.emit('blinds', `${cap(say(sbP, `pone la ciega pequeña (${sbAmt})`, `pones la ciega pequeña (${sbAmt})`))} y ${say(bbP, `la ciega grande (${bbAmt})`, `tú la ciega grande (${bbAmt})`)}.`);

    this.currentBet = Math.max(sbP.bet, bbP.bet);
    this.minRaise = this.bb;
    this.raiseLevel = 0;

    for (let r = 0; r < 2; r++) {
      let i = this.button;
      for (let k = 0; k < this.players.length; k++) {
        i = this.nextIndex(i);
        this.players[i].hole.push(...this.deck.draw(1));
      }
    }
    this.emit('deal', 'Se reparten 2 cartas a cada jugador.');

    // checkRound busca el siguiente que deba actuar a partir de toAct: preflop, el de la izquierda de la ciega grande.
    this.phase = 'betting';
    this.toAct = this.bbIndex;
    this.checkRound();
  }

  // ---------- acciones ----------
  legalActions() {
    const p = this.current;
    if (!p) return null;
    const toCall = this.currentBet - p.bet;
    const othersCanRespond = this.players.some((o) => o !== p && this.canAct(o));
    const reopened = !p.hasActed || p.actedAt < this.raiseLevel;
    const maxTo = p.bet + p.stack;
    let minTo = this.currentBet === 0 ? this.bb : this.currentBet + this.minRaise;
    if (maxTo < minTo) minTo = maxTo; // solo puede ir all-in
    return {
      toCall,
      canCheck: toCall === 0,
      canCall: toCall > 0,
      callAmount: Math.min(toCall, p.stack),
      canRaise: p.stack > toCall && reopened && othersCanRespond,
      isBet: this.currentBet === 0,
      minRaiseTo: minTo,
      maxRaiseTo: maxTo,
    };
  }

  // action: { type: 'fold' | 'check' | 'call' | 'raise', amount?: total al que se sube }
  act(action) {
    const p = this.current;
    if (!p) throw new Error('No es el turno de nadie');
    const la = this.legalActions();
    const { type } = action;

    if (type === 'fold') {
      p.folded = true;
      this.emit('action', say(p, 'se retira (fold).', 'Te retiras (fold).'), { player: p.id, action: 'fold' });
    } else if (type === 'check') {
      if (!la.canCheck) throw new Error('No se puede pasar: hay una apuesta');
      this.emit('action', say(p, 'pasa (check).', 'Pasas (check).'), { player: p.id, action: 'check' });
    } else if (type === 'call') {
      if (!la.canCall) throw new Error('No hay nada que igualar');
      const a = this.put(p, la.callAmount);
      const txt = p.allIn
        ? say(p, `iguala con todo lo que le queda: ${a} (all-in).`, `Igualas con todo lo que te queda: ${a} (all-in).`)
        : a === p.bet ? say(p, `iguala (call) ${a}.`, `Igualas (call) ${a}.`) : say(p, `iguala (call) a ${p.bet} (pone ${a} más).`, `Igualas (call) a ${p.bet} (pones ${a} más).`);
      this.emit('action', txt,
        { player: p.id, action: 'call', amount: a });
    } else if (type === 'raise') {
      if (!la.canRaise) throw new Error('No se puede subir');
      const to = Math.round(action.amount);
      if (to > la.maxRaiseTo || (to < la.minRaiseTo && to !== la.maxRaiseTo) || to <= this.currentBet) {
        throw new Error(`Subida inválida: ${to} (mínimo ${la.minRaiseTo}, máximo ${la.maxRaiseTo})`);
      }
      const wasBet = la.isBet;
      const size = to - this.currentBet;
      if (size >= this.minRaise) {
        this.minRaise = size;
        this.raiseLevel++;
      }
      this.currentBet = to;
      this.put(p, to - p.bet);
      const allIn = p.allIn ? ' (all-in)' : '';
      this.emit('action', wasBet ? say(p, `apuesta (bet) ${to}${allIn}.`, `Apuestas (bet) ${to}${allIn}.`) : say(p, `sube (raise) a ${to}${allIn}.`, `Subes (raise) a ${to}${allIn}.`),
        { player: p.id, action: wasBet ? 'bet' : 'raise', amount: to });
    } else {
      throw new Error(`Acción desconocida: ${type}`);
    }

    p.hasActed = true;
    p.actedAt = this.raiseLevel;
    p.lastAction = { type: type === 'raise' && la.isBet ? 'bet' : type, amount: p.bet, allIn: p.allIn };
    this.checkRound();
  }

  needsAction(p) {
    return this.canAct(p) && (!p.hasActed || p.bet < this.currentBet);
  }

  checkRound() {
    if (this.livePlayers.length === 1) return this.finishUncontested();

    const actors = this.players.filter((p) => this.canAct(p));
    const pending = actors.filter((p) => this.needsAction(p));
    const loneActorDone = actors.length <= 1 && actors.every((p) => p.bet >= this.currentBet);
    if (pending.length === 0 || loneActorDone) {
      this.phase = 'street-end';
      this.toAct = -1;
      return;
    }
    this.phase = 'betting';
    const start = this.toAct >= 0 ? this.toAct : this.button;
    this.toAct = this.nextIndex(start, (p) => this.needsAction(p));
  }

  // ---------- avanzar calle ----------
  next() {
    if (this.phase !== 'street-end') throw new Error('Todavía hay apuestas pendientes');
    for (const p of this.players) {
      Object.assign(p, { bet: 0, hasActed: false, actedAt: -1 });
      if (!p.folded && !p.allIn) p.lastAction = null;
    }
    this.currentBet = 0;
    this.minRaise = this.bb;
    this.raiseLevel = 0;

    if (this.street === 'river') return this.showdown();

    this.street = NEXT_STREET[this.street];
    const cards = this.deck.draw(CARDS_PER_STREET[this.street]);
    this.board.push(...cards);
    this.emit('street', `${STREET_NAMES[this.street]}: ${cards.map(cardLabel).join(' ')}`, { cards });

    const actors = this.players.filter((p) => this.canAct(p));
    if (actors.length >= 2) {
      this.phase = 'betting';
      this.toAct = this.nextIndex(this.button, (p) => this.canAct(p));
    } else {
      // Todos (o todos menos uno) están all-in: se reparten las cartas que faltan sin apuestas.
      this.phase = 'street-end';
      this.toAct = -1;
    }
  }

  // ---------- final de mano ----------
  finishUncontested() {
    const w = this.livePlayers[0];
    const amount = this.pot;
    w.stack += amount;
    this.phase = 'hand-over';
    this.toAct = -1;
    this.result = { uncontested: true, winners: [w.id], pots: [{ amount, eligible: [w.id], winners: [w.id] }], hands: {}, won: { [w.id]: amount } };
    this.emit('win', `Todos los demás se han retirado: ${say(w, `gana el bote de ${amount} sin enseñar sus cartas.`, `ganas el bote de ${amount} sin enseñar tus cartas.`)}`, { player: w.id });
  }

  // Divide el bote en bote principal y botes secundarios según lo que ha puesto cada uno.
  buildPots() {
    const levels = [...new Set(this.livePlayers.map((p) => p.totalBet))].sort((a, b) => a - b);
    const pots = [];
    let prev = 0;
    for (const level of levels) {
      const amount = this.players.reduce((s, p) => s + Math.max(0, Math.min(p.totalBet, level) - prev), 0);
      const eligible = this.livePlayers.filter((p) => p.totalBet >= level).map((p) => p.id);
      if (amount > 0) {
        const last = pots[pots.length - 1];
        // Si los que pueden ganarlo son los mismos, se junta con el anterior.
        if (last && last.eligible.join() === eligible.join()) last.amount += amount;
        else pots.push({ amount, eligible });
      }
      prev = level;
    }
    return pots;
  }

  showdown() {
    this.phase = 'hand-over';
    this.toAct = -1;
    const hands = {};
    for (const p of this.livePlayers) hands[p.id] = evaluate([...p.hole, ...this.board]);
    this.emit('showdown', 'Showdown: se enseñan las cartas.');
    for (const p of this.livePlayers) {
      this.emit('reveal', `${p.name}: ${p.hole.map(cardLabel).join(' ')} → ${hands[p.id].description}.`, { player: p.id });
    }

    const pots = this.buildPots();
    const won = {};
    pots.forEach((pot, idx) => {
      let best = [];
      for (const id of pot.eligible) {
        if (!best.length) best = [id];
        else {
          const c = compareHands(hands[id], hands[best[0]]);
          if (c > 0) best = [id];
          else if (c === 0) best.push(id);
        }
      }
      pot.winners = best;
      // Reparto: las fichas sobrantes de una división van a los primeros a la izquierda del botón.
      const ordered = [];
      let i = this.button;
      for (let k = 0; k < this.players.length; k++) {
        i = this.nextIndex(i);
        if (best.includes(i)) ordered.push(i);
      }
      const share = Math.floor(pot.amount / best.length);
      let rest = pot.amount - share * best.length;
      for (const id of ordered) {
        const amt = share + (rest-- > 0 ? 1 : 0);
        this.players[id].stack += amt;
        won[id] = (won[id] ?? 0) + amt;
      }
      const label = pots.length === 1 ? 'el bote' : idx === 0 ? 'el bote principal' : `el bote secundario ${idx}`;
      const names = best.map((id) => this.players[id].name);
      if (pot.eligible.length === 1) {
        this.emit('win', cap(say(this.players[best[0]], `recupera ${pot.amount} que nadie pudo igualar.`, `recuperas ${pot.amount} que nadie pudo igualar.`)), { player: best[0] });
      } else if (best.length === 1) {
        this.emit('win', cap(say(this.players[best[0]], `gana ${label} (${pot.amount}) con ${hands[best[0]].description}.`, `ganas ${label} (${pot.amount}) con ${hands[best[0]].description}.`)), { player: best[0] });
      } else {
        this.emit('win', best.some((id) => this.players[id].isHuman)
          ? `Empatas con ${names.filter((n, k) => !this.players[best[k]].isHuman).join(' y ')} y os repartís ${label} (${pot.amount}).`
          : `${names.join(' y ')} empatan y se reparten ${label} (${pot.amount}).`, { players: best });
      }
    });

    this.result = { uncontested: false, winners: [...new Set(pots.flatMap((p) => p.winners))], pots, hands, won };
  }
}
