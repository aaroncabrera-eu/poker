// Entrenador: explica la situación del jugador humano y recomienda una acción.

import { rankName } from './cards.js';
import { evaluate, compareHands } from './hands.js';
import { situation, raiseTarget } from './bots.js';
import { findOuts, ruleOf2and4, exactFormula } from './outs.js';

const pct = (x) => `${Math.round(x * 100)}%`;

// Descripción de las 2 cartas propias antes del flop.
export function describeHole([a, b]) {
  const [hi, lo] = a.rank >= b.rank ? [a, b] : [b, a];
  if (hi.rank === lo.rank) return `Pareja de mano (pocket pair) de ${rankName(hi.rank, true)}`;
  const suited = hi.suit === lo.suit;
  const gap = hi.rank - lo.rank;
  const extras = [suited ? 'del mismo palo (suited)' : 'de distinto palo (offsuit)'];
  if (gap === 1 || (hi.rank === 14 && lo.rank === 2)) extras.push('seguidas (connectors)');
  return `${rankName(hi.rank)} y ${rankName(lo.rank)} ${extras.join(', ')}`;
}

export function advise(game) {
  const { p, la, opponents, equity, potOdds, strength } = situation(game, 1500);
  const lines = [];

  // 1. Qué tienes
  if (game.board.length === 0) {
    lines.push(`Tus cartas: ${describeHole(p.hole)}.`);
  } else {
    const mine = evaluate([...p.hole, ...game.board]);
    let txt = `Tu mano ahora: ${mine.description}.`;
    if (game.board.length === 5 && compareHands(mine, evaluate(game.board)) === 0) {
      txt += ' Ojo: tu mejor mano está entera en la mesa, así que la tienen todos.';
    }
    lines.push(txt);
  }

  // 2. Probabilidad
  const rivals = opponents === 1 ? '1 rival' : `${opponents} rivales`;
  lines.push(`Contra ${rivals}, ganarías más o menos el ${pct(equity)} de las veces (suponiendo cartas al azar; si alguien ha subido fuerte, seguramente menos).`);

  // 2b. Cómo calcularlo de cabeza: outs (solo en el flop y el turn)
  const math = [];
  if (game.board.length === 3 || game.board.length === 4) {
    const mine = evaluate([...p.hole, ...game.board]);
    const r = findOuts(p.hole, game.board, { minCategory: mine.category + 1 });
    const n = r.outs.length;
    if (n > 0) {
      const names = [...new Set(r.outs.map((o) => o.hand.name))].join(', ').toLowerCase();
      math.push(`Tienes ${n} outs (cartas que te mejoran: ${names}).`);
      math.push(`De cabeza: ${n} × ${r.cardsToCome === 2 ? 4 : 2} ≈ ${ruleOf2and4(n, r.cardsToCome)}% de mejorar ${r.cardsToCome === 2 ? 'de aquí al river' : 'en el river'}.`);
      math.push(`Cuenta exacta: ${exactFormula(n, r.unseen, r.cardsToCome)}.`);
      math.push('Mejorar no es lo mismo que ganar: a veces ganas sin mejorar y a veces pierdes aunque mejores. Por eso el porcentaje de arriba es distinto.');
    } else {
      math.push('Ninguna carta te mejora por sí sola: lo que tienes ahora es lo que cuenta.');
    }
  }

  // 3. Coste de seguir y recomendación
  let rec;
  let why;
  if (la.toCall > 0) {
    lines.push(`Para seguir tienes que poner ${la.callAmount} y el bote ya tiene ${game.pot}. Necesitas ganar al menos ${la.callAmount} / (${game.pot} + ${la.callAmount}) = ${pct(potOdds)} de las veces para que pagar compense a la larga. Esto se llama pot odds.`);
    if (la.canRaise && (equity > 0.7 || strength > 2)) {
      rec = 'raise';
      why = `Vas claramente por delante (${pct(equity)} frente al ${pct(potOdds)} que necesitas). Subir hace que los demás paguen más cuando tienes ventaja.`;
    } else if (equity >= potOdds) {
      rec = 'call';
      why = `Tu ${pct(equity)} es mayor que el ${pct(potOdds)} que necesitas: igualar sale rentable.`;
    } else {
      rec = 'fold';
      why = `Tu ${pct(equity)} es menor que el ${pct(potOdds)} que necesitas: si pagas en situaciones así, a la larga pierdes fichas.`;
    }
  } else {
    lines.push('Nadie ha apostado en esta ronda, así que puedes pasar gratis.');
    if (la.canRaise && (strength > 1.6 || equity > 0.65)) {
      rec = 'bet';
      why = 'Tu mano es fuerte: apuesta para que los que tienen manos peores paguen. Si pasas, regalas cartas gratis.';
    } else {
      rec = 'check';
      why = 'Tu mano no es lo bastante fuerte para apostar. Pasar no cuesta nada y ves qué hacen los demás.';
    }
  }

  const amount = rec === 'raise' ? raiseTarget(game, 0.75) : rec === 'bet' ? raiseTarget(game, 0.6) : null;
  const label = {
    fold: 'Retirarte (fold)',
    call: `Igualar ${la.callAmount} (call)`,
    check: 'Pasar (check)',
    raise: `Subir a ${amount} (raise)`,
    bet: `Apostar ${amount} (bet)`,
  }[rec];
  return { rec, amount, label, why, lines, math, equity, potOdds, toCall: la.toCall, isBet: la.isBet };
}

// Valora la jugada del humano comparándola con lo que recomendaba el entrenador.
// action: { type: 'fold' | 'check' | 'call' | 'raise' }. Devuelve { grade: 'good' | 'ok' | 'bad', title, text }.
export function judgeAction(advice, action) {
  const did = action.type === 'raise' ? (advice.isBet ? 'bet' : 'raise') : action.type;
  const e = pct(advice.equity);
  const need = pct(advice.potOdds);
  const ahead = advice.equity - advice.potOdds;
  const G = (grade, text) => ({ grade, text, title: { good: 'Buena jugada', ok: 'Jugada aceptable', bad: 'Jugada mejorable' }[grade] });

  switch (advice.rec) {
    case 'fold':
      if (did === 'fold') return G('good', `Bien retirado: tenías un ${e} y necesitabas un ${need} para que pagar compensara.`);
      if (did === 'call') return G('bad', `Pagaste con un ${e} cuando necesitabas un ${need}. Hecho muchas veces, esto pierde fichas.`);
      return G('bad', `Subir con una mano floja (${e}) es un farol. A veces funciona, pero a la larga cuesta fichas, sobre todo contra rivales que lo pagan todo.`);
    case 'call':
      if (did === 'call') return G('good', `Bien pagado: tu ${e} es mayor que el ${need} que necesitabas.`);
      if (did === 'raise') return G('ok', `Vas algo por delante (${e} frente a ${need}), pero no tanto: subir arriesga más fichas. Igualar era suficiente.`);
      return G(ahead > 0.1 ? 'bad' : 'ok', `Demasiado prudente: tenías un ${e} y solo necesitabas un ${need}. Pagar habría sido rentable a la larga.`);
    case 'raise':
      if (did === 'raise') return G('good', `Bien subido: con un ${e} vas claramente por delante y haces que paguen más.`);
      if (did === 'call') return G('ok', `Correcto, aunque con un ${e} podías subir para ganar más cuando vas por delante.`);
      return G('bad', `Tiraste una mano muy buena: tenías un ${e} y solo necesitabas un ${need}.`);
    case 'bet':
      if (did === 'bet') return G('good', `Bien apostado: tu mano (${e}) es fuerte y así cobras a las manos peores.`);
      if (did === 'check') return G('ok', `Algo pasivo: con un ${e} conviene apostar. Pasando dejas ver cartas gratis a los demás.`);
      return G('bad', 'No hacía falta retirarse: nadie había apostado y podías pasar gratis, y además tu mano era fuerte.');
    default: // check
      if (did === 'check') return G('good', `Bien pasado: con un ${e} no merece la pena apostar, y pasar es gratis.`);
      if (did === 'fold') return G('bad', 'No hacía falta retirarse: nadie había apostado y podías pasar gratis.');
      return G('ok', `Apostar con un ${e} es casi un farol. Puede funcionar si los rivales se retiran, pero arriesgas fichas con una mano floja.`);
  }
}
