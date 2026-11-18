// Entrenador: explica la situación del jugador humano y recomienda una acción.

import { rankName } from './cards.js';
import { evaluate, compareHands } from './hands.js';
import { situation, raiseTarget } from './bots.js';

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
  return { rec, amount, label, why, lines, equity, potOdds };
}
