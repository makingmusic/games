import {
  COLS,
  ROWS,
  allTiles,
  hasLineOfSight,
  hexDistance,
  inSection,
  isOnBoard,
  neighbours,
  obstacleAt,
  sectionsAt,
  terrainAt,
  tileKey,
} from "./board.js";
import { cardById, makeDeck, oppositeSection } from "./content/cards.js";
import { FACE_FROM_ROLL, facesFromRolls, hitsTarget, symbolMatchesUnit } from "./content/dice.js";
import { OBSTACLES, TERRAIN } from "./content/terrain.js";
import {
  SIDES,
  SIDE_LABELS,
  UNIT_TYPES,
  battleAfterMoveFor,
  diceAtRange,
  isResistance,
  isSpecialForces,
  printedFigures,
} from "./content/units.js";
import { cryptoRng, shuffleInPlace } from "./rng.js";
import { scenarioById } from "./scenarios/index.js";

export { SIDES, SIDE_LABELS, UNIT_TYPES, COLS, ROWS, allTiles, hexDistance, inSection, sectionsAt };
export { SCENARIO_LIST, SCENARIOS, scenarioById } from "./scenarios/index.js";
export { CARD_DECK, cardById } from "./content/cards.js";
export { FACE_FROM_ROLL, DIE_FACES } from "./content/dice.js";

export class GameRuleError extends Error {
  constructor(message, code = "INVALID_ACTION", extra = {}) {
    super(message);
    this.name = "GameRuleError";
    this.code = code;
    Object.assign(this, extra);
  }
}

export function cloneGame(state) {
  return structuredClone(state);
}

export function unitAt(state, q, r) {
  return state.units.find((unit) => unit.q === q && unit.r === r) ?? null;
}

export function unitById(state, unitId) {
  return state.units.find((unit) => unit.id === unitId) ?? null;
}

export function effectiveCard(state) {
  if (!state.playedCard) return null;
  const card = cardById(state.playedCard);
  if (!card) return null;
  if (state.cardOverride) return { ...card, ...state.cardOverride };
  return card;
}

function addLog(state, message) {
  state.log = [message, ...state.log].slice(0, 16);
}

function otherSide(side) {
  return side === "ochre" ? "teal" : "ochre";
}

function baselineRow(side) {
  return side === "ochre" ? ROWS - 1 : 0;
}

function requireSide(state, side) {
  if (side !== state.activeSide) throw new GameRuleError("It is not your command.", "WRONG_SIDE");
}

function requirePhase(state, ...phases) {
  if (!phases.includes(state.phase)) {
    throw new GameRuleError("That action is not available now.", "WRONG_PHASE");
  }
}

function takeFromHand(state, side, cardId) {
  const hand = state.hands[side];
  const index = hand.indexOf(cardId);
  if (index === -1) throw new GameRuleError("That card is not in your hand.", "CARD_NOT_IN_HAND");
  hand.splice(index, 1);
  return cardById(cardId);
}

function occupyKey(state) {
  return new Set(state.units.map((unit) => tileKey(unit.q, unit.r)));
}

function isImpassable(state, unit, q, r) {
  const terrain = terrainAt(state, q, r);
  const obstacle = obstacleAt(state, q, r);
  if (terrain === "river") return true;
  if (TERRAIN[terrain]?.impassable) return true;
  if (obstacle && OBSTACLES[obstacle.type]?.impassableTo?.includes(unit.type)) return true;
  if (terrain === "cliff" && unit.type !== "infantry") {
    const fromBeach = terrainAt(state, unit.startQ, unit.startR) === "beach"
      || terrainAt(state, unit.q, unit.r) === "beach";
    if (fromBeach) return true;
  }
  return false;
}

function cannotRetreatInto(state, q, r) {
  const terrain = terrainAt(state, q, r);
  return terrain === "ocean" || terrain === "river" || !isOnBoard(q, r);
}

export function attackDiceReduction(state, attacker, target) {
  if (attacker.type === "artillery") return 0;
  let best = 0;
  const targetTerrain = terrainAt(state, target.q, target.r);
  const targetDef = TERRAIN[targetTerrain] ?? TERRAIN.open;
  if (targetDef.reduction) best = Math.max(best, targetDef.reduction[attacker.type] ?? 0);
  if (targetTerrain === "hill" || targetTerrain === "cliff") {
    const attackerHill = terrainAt(state, attacker.q, attacker.r) === "hill"
      || terrainAt(state, attacker.q, attacker.r) === "cliff";
    if (!attackerHill) best = Math.max(best, targetDef.uphillReduction ?? 1);
  }
  if (attacker.type === "armor" && terrainAt(state, attacker.q, attacker.r) === "town") {
    best = Math.max(best, TERRAIN.town.armorOutReduction);
  }
  const obstacle = obstacleAt(state, target.q, target.r);
  if (obstacle) {
    const def = OBSTACLES[obstacle.type];
    const ownerOk = !def.ownerOnlyProtection || obstacle.owner === target.side;
    if (ownerOk && def.reduction) best = Math.max(best, def.reduction[attacker.type] ?? 0);
    if (obstacle.type === "sandbag" && !targetDef.reduction) {
      best = Math.max(best, def.reductionIfNoTerrain?.[attacker.type] ?? 0);
    }
  }
  const attackerWire = obstacleAt(state, attacker.q, attacker.r);
  if (attackerWire?.type === "wire") best = Math.max(best, OBSTACLES.wire.battleOutReduction);
  return best;
}

export function battleDiceCount(state, attacker, target, extras = {}) {
  const range = hexDistance(attacker, target);
  let dice = extras.fixedDice ?? diceAtRange(attacker.type, range);
  if (dice <= 0 && extras.fixedDice == null) return 0;
  dice -= attackDiceReduction(state, attacker, target);
  if (extras.bonus) dice += extras.bonus;
  if (state.battleBonus) dice += state.battleBonus;
  const card = effectiveCard(state);
  if (card?.family === "armor-push" && attacker.type === "armor" && range === 1) dice += 1;
  if (card?.family === "close-assault") dice += 1;
  if (card?.family === "firefight") dice += 1;
  if (card?.family === "finest-hour") dice += 1;
  return Math.max(0, dice);
}

function ignoresFirstFlag(state, defender) {
  const card = effectiveCard(state);
  if (card?.family === "air-strike" || card?.family === "barrage") return false;
  if (state.flagsCannotIgnore) return false;
  const obstacle = obstacleAt(state, defender.q, defender.r);
  if (!obstacle) return false;
  if (obstacle.type === "sandbag") return true;
  if (obstacle.type === "hedgehog" && defender.type === "infantry") return true;
  if (obstacle.type === "bunker" && obstacle.owner === defender.side) return true;
  return false;
}

function removeSandbagsIfEmpty(state, q, r) {
  const obstacle = obstacleAt(state, q, r);
  if (!obstacle || obstacle.type !== "sandbag" || obstacle.permanent) return;
  if (unitAt(state, q, r)) return;
  state.obstacles = state.obstacles.filter((item) => item !== obstacle);
}

function scoreElimination(state, attackerSide, victim) {
  const value = victim.tags?.includes("double-medal") ? 2 : 1;
  state.medals[attackerSide] += value;
  state.medalRack[attackerSide].push(victim.id);
  addLog(state, `${SIDE_LABELS[attackerSide]} claimed ${value} medal${value === 1 ? "" : "s"}.`);
}

function refreshObjectives(state) {
  for (const objective of state.objectives) {
    const occupant = unitAt(state, objective.q, objective.r);
    if (objective.kind === "temporary") {
      const previous = objective.heldBy;
      objective.heldBy = occupant && (!objective.scorer || occupant.side === objective.scorer)
        ? occupant.side
        : null;
      if (previous && previous !== objective.heldBy) state.medals[previous] -= 1;
      if (objective.heldBy && objective.heldBy !== previous) state.medals[objective.heldBy] += 1;
    } else if (objective.kind === "permanent" && occupant && !objective.claimedBy) {
      if (!objective.scorer || occupant.side === objective.scorer) {
        objective.claimedBy = occupant.side;
        state.medals[occupant.side] += 1;
      }
    }
  }
}

function checkVictory(state) {
  for (const side of SIDES) {
    if (state.medals[side] >= state.medalGoal) {
      state.phase = "finished";
      state.winner = side;
      state.winReason = "medals";
      addLog(state, `${SIDE_LABELS[side]} wins.`);
      return true;
    }
  }
  if (state.specials?.deckClock && state.deck.length === 0 && state.hands.ochre.length === 0) {
    state.phase = "finished";
    state.winner = "teal";
    state.winReason = "deck-clock";
    addLog(state, "The deck is exhausted. Axis wins.");
    return true;
  }
  return false;
}

function eliminateUnit(state, unit, attackerSide) {
  const { q, r } = unit;
  state.units = state.units.filter((candidate) => candidate.id !== unit.id);
  removeSandbagsIfEmpty(state, q, r);
  scoreElimination(state, attackerSide, unit);
  refreshObjectives(state);
  checkVictory(state);
}

function applyHitsAndFlags(state, defender, faces, attackerSide, options = {}) {
  const starsHit = options.starsHit === true;
  const unitSymbolsHit = options.unitSymbolsHit === true;
  let hits = 0;
  let flags = 0;
  for (const face of faces) {
    if (hitsTarget(face, defender.type, { starsHit, unitSymbolsHit })) hits += 1;
    else if (face === "flag") flags += 1;
  }
  defender.figures -= hits;
  addLog(state, `${hits} hit${hits === 1 ? "" : "s"}, ${flags} push${flags === 1 ? "" : "es"}.`);
  if (defender.figures <= 0) {
    eliminateUnit(state, defender, attackerSide);
    return { eliminated: true, vacated: true, flags: 0 };
  }
  if (flags > 0 && ignoresFirstFlag(state, defender)) flags -= 1;
  if (isResistance(defender) && options.retreatPerFlag > 1) {
    flags *= options.retreatPerFlag;
  }
  let vacated = false;
  const bunker = obstacleAt(state, defender.q, defender.r);
  const artilleryPinned = defender.type === "artillery" && bunker?.type === "bunker";
  for (let i = 0; i < flags; i += 1) {
    if (artilleryPinned) {
      defender.figures -= 1;
      if (defender.figures <= 0) {
        eliminateUnit(state, defender, attackerSide);
        return { eliminated: true, vacated: true, flags };
      }
      continue;
    }
    const step = retreatStep(state, defender);
    if (!step) {
      defender.figures -= 1;
      if (defender.figures <= 0) {
        eliminateUnit(state, defender, attackerSide);
        return { eliminated: true, vacated: true, flags };
      }
    } else {
      const from = { q: defender.q, r: defender.r };
      defender.q = step.q;
      defender.r = step.r;
      vacated = true;
      removeSandbagsIfEmpty(state, from.q, from.r);
    }
  }
  refreshObjectives(state);
  checkVictory(state);
  return { eliminated: false, vacated, flags };
}

function retreatStep(state, unit) {
  const goal = baselineRow(unit.side);
  const occupied = occupyKey(state);
  const options = neighbours(unit.q, unit.r).filter((hex) => {
    if (occupied.has(tileKey(hex.q, hex.r))) return false;
    if (isImpassable(state, unit, hex.q, hex.r)) return false;
    if (cannotRetreatInto(state, hex.q, hex.r)) return false;
    return Math.abs(hex.r - goal) < Math.abs(unit.r - goal);
  });
  options.sort((a, b) => a.q - b.q || a.r - b.r);
  return options[0] ?? null;
}

function pathTouchesBeach(state, path) {
  return path.some((hex) => terrainAt(state, hex.q, hex.r) === "beach");
}

export function reachableTiles(state, unitId) {
  const unit = unitById(state, unitId);
  if (!unit || !unit.ordered || unit.moved || state.phase !== "move") return [];
  const card = effectiveCard(state);
  if (card?.family === "close-assault" || card?.family === "firefight") return [];

  let cap = UNIT_TYPES[unit.type].maxMove;
  if (terrainAt(state, unit.q, unit.r) === "ocean") cap = 1;
  if (card?.family === "gun-line" && unit.type === "artillery") cap = 3;
  if (card?.family === "deep-patrol") cap = 3;
  if (card?.family === "infantry-push" && unit.type === "infantry") cap = 3;
  if (state.deepPatrolExit === unit.id) cap = 3;
  const ignoreMoveLimits = card?.family === "deep-patrol" || state.deepPatrolExit === unit.id;

  const occupied = occupyKey(state);
  occupied.delete(tileKey(unit.q, unit.r));
  const start = { q: unit.q, r: unit.r, cost: 0, stopped: false };
  const best = new Map([[tileKey(unit.q, unit.r), 0]]);
  const frontier = [start];
  const results = [];

  while (frontier.length > 0) {
    const current = frontier.shift();
    if (current.stopped || current.cost >= cap) continue;
    for (const next of neighbours(current.q, current.r)) {
      const key = tileKey(next.q, next.r);
      if (occupied.has(key)) continue;
      if (isImpassable(state, unit, next.q, next.r)) continue;
      const terrain = terrainAt(state, next.q, next.r);
      const obstacle = obstacleAt(state, next.q, next.r);
      if (!ignoreMoveLimits && TERRAIN.hedgerow.mustStartAdjacentToEnter && terrain === "hedgerow") {
        const startAdjacent = neighbours(unit.startQ, unit.startR)
          .some((hex) => hex.q === next.q && hex.r === next.r);
        if (!startAdjacent) continue;
      }
      const cost = current.cost + 1;
      if (cost > cap) continue;
      const pathPreview = [...(current.path ?? []), next];
      if (!ignoreMoveLimits && pathTouchesBeach(state, pathPreview) && cost > 2) continue;
      if (best.has(key) && best.get(key) <= cost) continue;
      const stop = ignoreMoveLimits
        ? false
        : Boolean(
          TERRAIN[terrain]?.stopOnEnter
          || obstacle?.type === "wire"
          || (terrain === "hedgerow")
          || (unit.startTerrain === "hedgerow" && terrain !== "hedgerow")
          || (terrain === "cliff" && terrainAt(state, unit.startQ, unit.startR) === "beach"),
        );
      best.set(key, cost);
      const entry = { q: next.q, r: next.r, cost, stopped: stop, path: pathPreview };
      results.push(entry);
      frontier.push(entry);
    }
  }
  return results;
}

function adjacentEnemies(state, unit) {
  return neighbours(unit.q, unit.r)
    .map((hex) => unitAt(state, hex.q, hex.r))
    .filter((other) => other && other.side !== unit.side);
}

export function legalTargets(state, unitId) {
  const unit = unitById(state, unitId);
  if (!unit || !unit.ordered || unit.battled) return [];
  if (state.phase !== "battle" && state.phase !== "overrun") return [];
  if (terrainAt(state, unit.q, unit.r) === "ocean") return [];
  const card = effectiveCard(state);
  const moved = unit.movedHexes;
  if (unit.type === "artillery" && moved > 0 && card?.family !== "gun-line") return [];
  if (card?.family === "gun-line" && moved > 0) return [];
  const battleAfter = card?.family === "infantry-push" && unit.type === "infantry"
    ? 2
    : battleAfterMoveFor(unit);
  if (moved > battleAfter) return [];
  if (unit.enteredCover && !isResistance(unit) && card?.family !== "deep-patrol") return [];

  const adjacent = adjacentEnemies(state, unit);
  if (adjacent.length > 0 && unit.type !== "artillery") {
    return adjacent;
  }

  const rangeMax = UNIT_TYPES[unit.type].rangeDice.length;
  return state.units.filter((target) => {
    if (target.side === unit.side) return false;
    const range = hexDistance(unit, target);
    if (range < 1 || range > rangeMax) return false;
    if (unit.type !== "artillery" && !hasLineOfSight(state, unit, target)) return false;
    if (state.specials?.wideRiver && unit.type === "infantry") {
      const riverBetween = false;
      if (riverBetween) return false;
    }
    return diceAtRange(unit.type, range) > 0;
  });
}

function unitsOf(state, side) {
  return state.units.filter((unit) => unit.side === side);
}

function hasType(state, side, type) {
  return unitsOf(state, side).some((unit) => unit.type === type);
}

export function orderableUnits(state, side = state.activeSide) {
  const card = effectiveCard(state);
  if (!card) return [];
  const own = unitsOf(state, side);
  const fallbackAny = () => own;

  switch (card.family) {
    case "assault":
    case "probe":
    case "attack":
    case "recon":
      return own.filter((unit) => inSection(unit.q, card.section));
    case "full-front":
      return own;
    case "pincer":
      return own.filter((unit) => inSection(unit.q, "left") || inSection(unit.q, "right"));
    case "three-scout":
      return own;
    case "headquarters":
      return own;
    case "move-out":
      return hasType(state, side, "infantry") ? own.filter((unit) => unit.type === "infantry") : own;
    case "armor-push":
      return hasType(state, side, "armor") ? own.filter((unit) => unit.type === "armor") : own;
    case "gun-line":
      return hasType(state, side, "artillery") ? own.filter((unit) => unit.type === "artillery") : own;
    case "deep-patrol":
      return hasType(state, side, "infantry") ? own.filter((unit) => unit.type === "infantry") : own;
    case "infantry-push": {
      if (!hasType(state, side, "infantry")) return own;
      const section = state.cardOverride?.section;
      if (!section) return own.filter((unit) => unit.type === "infantry");
      return own.filter((unit) => unit.type === "infantry" && inSection(unit.q, section));
    }
    case "close-assault":
      return own.filter((unit) => (
        (unit.type === "infantry" || unit.type === "armor")
        && adjacentEnemies(state, unit).length > 0
      ));
    case "firefight":
      return own.filter((unit) => adjacentEnemies(state, unit).length === 0);
    case "finest-hour":
      return own.filter((unit) => state.finestHourIds?.includes(unit.id));
    default:
      return fallbackAny();
  }
}

function validateOrders(state, side, unitIds) {
  const card = effectiveCard(state);
  const unique = [...new Set(unitIds)];
  const allowed = orderableUnits(state, side);
  for (const id of unique) {
    if (!allowed.some((unit) => unit.id === id)) {
      throw new GameRuleError("That unit cannot be ordered by this card.", "ILLEGAL_ORDER");
    }
  }
  const own = unitsOf(state, side);
  const countIn = (section) => unique
    .map((id) => unitById(state, id))
    .filter((unit) => inSection(unit.q, section)).length;

  switch (card.family) {
    case "assault":
      break;
    case "probe":
      if (unique.length > 2) throw new GameRuleError("Probe orders at most 2 units.", "TOO_MANY_ORDERS");
      break;
    case "attack":
      if (unique.length > 3) throw new GameRuleError("Attack orders at most 3 units.", "TOO_MANY_ORDERS");
      break;
    case "recon":
      if (unique.length > 1) throw new GameRuleError("Scout orders 1 unit.", "TOO_MANY_ORDERS");
      break;
    case "full-front":
      if (countIn("left") > 2 || countIn("center") > 2 || countIn("right") > 2) {
        throw new GameRuleError("Full Front orders at most 2 units per section.", "TOO_MANY_ORDERS");
      }
      break;
    case "pincer":
      if (countIn("left") > 1 || countIn("right") > 1 || unique.length > 2) {
        throw new GameRuleError("Pincer orders 1 unit on the left and 1 on the right.", "TOO_MANY_ORDERS");
      }
      if (unique.some((id) => inSection(unitById(state, id).q, "center")
        && !inSection(unitById(state, id).q, "left")
        && !inSection(unitById(state, id).q, "right"))) {
        throw new GameRuleError("Pincer cannot order a purely centre unit.", "ILLEGAL_ORDER");
      }
      break;
    case "three-scout":
      if (countIn("left") > 1 || countIn("center") > 1 || countIn("right") > 1) {
        throw new GameRuleError("Three-Section Scout orders 1 unit per section.", "TOO_MANY_ORDERS");
      }
      break;
    case "headquarters":
      if (unique.length > 4) throw new GameRuleError("Headquarters orders at most 4 units.", "TOO_MANY_ORDERS");
      break;
    case "move-out":
      if (hasType(state, side, "infantry")) {
        if (unique.length > 4) throw new GameRuleError("Move Out orders at most 4 infantry.", "TOO_MANY_ORDERS");
      } else if (unique.length > 1) {
        throw new GameRuleError("With no infantry, Move Out orders 1 unit.", "TOO_MANY_ORDERS");
      }
      break;
    case "armor-push":
      if (hasType(state, side, "armor")) {
        if (unique.length > 4) throw new GameRuleError("Armor Push orders at most 4 armor.", "TOO_MANY_ORDERS");
      } else if (unique.length > 1) {
        throw new GameRuleError("With no armor, Armor Push orders 1 unit.", "TOO_MANY_ORDERS");
      }
      break;
    case "gun-line":
      if (hasType(state, side, "artillery")) {
        const arty = own.filter((unit) => unit.type === "artillery").map((unit) => unit.id);
        if (unique.some((id) => !arty.includes(id))) {
          throw new GameRuleError("Gun Line orders artillery.", "ILLEGAL_ORDER");
        }
      } else if (unique.length > 1) {
        throw new GameRuleError("With no artillery, Gun Line orders 1 unit.", "TOO_MANY_ORDERS");
      }
      break;
    case "deep-patrol":
      if (unique.length > 1) throw new GameRuleError("Deep Patrol orders 1 unit.", "TOO_MANY_ORDERS");
      break;
    case "infantry-push":
      if (!hasType(state, side, "infantry") && unique.length > 1) {
        throw new GameRuleError("With no infantry, Infantry Push orders 1 unit.", "TOO_MANY_ORDERS");
      }
      break;
    case "close-assault":
      break;
    case "firefight":
      if (unique.length > 4) throw new GameRuleError("Firefight orders at most 4 units.", "TOO_MANY_ORDERS");
      break;
    case "finest-hour":
      break;
    default:
      throw new GameRuleError("That card does not order units this way.", "WRONG_CARD");
  }
}

function resetTurnFlags(state) {
  for (const unit of state.units) {
    unit.moved = false;
    unit.movedHexes = 0;
    unit.battled = false;
    unit.enteredCover = false;
    unit.ordered = false;
    unit.overran = false;
    unit.tookGround = false;
    unit.startQ = unit.q;
    unit.startR = unit.r;
    unit.startTerrain = terrainAt(state, unit.q, unit.r);
  }
  state.orderedIds = [];
  state.groundPending = null;
  state.deepPatrolExit = null;
  state.secondShot = null;
  state.flagsCannotIgnore = false;
  state.battleBonus = 0;
  state.finestHourIds = null;
}

function beginMoveOrBattle(state) {
  const card = effectiveCard(state);
  if (card?.family === "close-assault" || card?.family === "firefight") {
    state.phase = "battle";
    return;
  }
  state.phase = "move";
}

function requireRolls(action, count) {
  if (!Array.isArray(action.rolls) || action.rolls.length !== count) {
    throw new GameRuleError(`This action needs ${count} die rolls.`, "ROLLS_REQUIRED", { rollsNeeded: count });
  }
  for (const value of action.rolls) {
    if (!Number.isInteger(value) || value < 1 || value > 6) {
      throw new GameRuleError("Die rolls must be integers from 1 to 6.", "BAD_ROLL");
    }
  }
}

function maybeTakeGround(state, attacker, targetHex, wasCloseAssault) {
  if (!wasCloseAssault) return false;
  if (attacker.type === "artillery") return false;
  if (!unitById(state, attacker.id)) return false;
  if (unitAt(state, targetHex.q, targetHex.r)) return false;
  state.groundPending = {
    unitId: attacker.id,
    q: targetHex.q,
    r: targetHex.r,
    canOverrun: attacker.type === "armor" && !attacker.overran,
  };
  state.phase = "ground";
  return true;
}

function finishUnitBattle(state, attacker) {
  if (state.phase === "finished") return;
  if (state.secondShot === attacker.id) {
    state.secondShot = "ready";
    return;
  }
  if (effectiveCard(state)?.family === "deep-patrol" && attacker.type === "infantry" && !state.deepPatrolExit) {
    state.deepPatrolExit = attacker.id;
    attacker.moved = false;
    attacker.movedHexes = 0;
    state.phase = "move";
    return;
  }
  if (state.phase === "overrun") {
    state.phase = "battle";
  }
}

function allOrderedDone(state, field) {
  return state.orderedIds.every((id) => {
    const unit = unitById(state, id);
    return !unit || unit[field];
  });
}

function drawOne(state, side) {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return null;
    return null;
  }
  const cardId = state.deck.shift();
  state.hands[side].push(cardId);
  return cardId;
}

function finishTurnDraw(state, side) {
  const card = effectiveCard(state);
  if (card?.reconDraw) {
    const drawn = [];
    for (let i = 0; i < 2; i += 1) {
      const id = drawOne(state, side);
      if (id) drawn.push(id);
    }
    state.drawPending = drawn;
    state.phase = "draw-keep";
    if (drawn.length <= 1) {
      completeTurn(state);
    }
    return;
  }
  drawOne(state, side);
  if (state.specials?.handRamp?.side === side) {
    const target = state.specials.handRamp.target;
    if (state.hands[side].length < target) drawOne(state, side);
  }
  completeTurn(state);
}

function completeTurn(state) {
  if (state.phase === "finished") return;
  const ending = state.activeSide;
  state.lastCard = {
    id: state.playedCard,
    family: effectiveCard(state)?.family,
    section: effectiveCard(state)?.section ?? state.cardOverride?.section ?? null,
    side: ending,
  };
  state.playedCard = null;
  state.cardOverride = null;
  state.drawPending = null;
  resetTurnFlags(state);
  refreshObjectives(state);
  if (checkVictory(state)) return;
  state.activeSide = otherSide(ending);
  state.turnCount += 1;
  state.phase = "play-card";
  addLog(state, `${SIDE_LABELS[state.activeSide]} plays a command card.`);
}

export function createGame(scenarioId = "pegasus-bridge", rng = cryptoRng()) {
  const scenario = scenarioById(scenarioId);
  if (!scenario) throw new GameRuleError("Unknown scenario.", "UNKNOWN_SCENARIO");

  const tiles = {};
  if (scenario.boardFace === "beach") {
    for (let q = 0; q < COLS; q += 1) {
      tiles[tileKey(q, 6)] = "beach";
      tiles[tileKey(q, 7)] = "ocean";
      tiles[tileKey(q, 8)] = "ocean";
    }
  }
  for (const tile of scenario.tiles) {
    tiles[tileKey(tile.q, tile.r)] = tile.terrain;
  }

  const units = scenario.units.map((unit) => {
    const figures = printedFigures(unit);
    return {
      ...unit,
      tags: [...(unit.tags ?? [])],
      figures,
      figuresMax: figures,
      moved: false,
      movedHexes: 0,
      battled: false,
      enteredCover: false,
      ordered: false,
      overran: false,
      tookGround: false,
      startQ: unit.q,
      startR: unit.r,
      startTerrain: tiles[tileKey(unit.q, unit.r)] ?? "open",
    };
  });

  const deck = makeDeck();
  shuffleInPlace(deck, rng);
  const hands = { ochre: [], teal: [] };
  const ochreHand = scenario.ochre.hand;
  const tealHand = scenario.teal.hand;
  for (let i = 0; i < ochreHand; i += 1) hands.ochre.push(deck.shift());
  for (let i = 0; i < tealHand; i += 1) hands.teal.push(deck.shift());

  const state = {
    schemaVersion: 2,
    scenarioId: scenario.id,
    title: scenario.title,
    briefing: scenario.briefing,
    date: scenario.date,
    boardFace: scenario.boardFace,
    phase: "play-card",
    activeSide: scenario.firstPlayer,
    winner: null,
    winReason: null,
    tiles,
    obstacles: (scenario.obstacles ?? []).map((item, index) => ({ id: `ob-${index}`, ...item })),
    units,
    hands,
    deck,
    discard: [],
    medals: { ochre: 0, teal: 0 },
    medalRack: { ochre: [], teal: [] },
    medalGoal: scenario.medals,
    objectives: (scenario.objectives ?? []).map((item) => ({ ...item, heldBy: null, claimedBy: null })),
    playedCard: null,
    cardOverride: null,
    lastCard: null,
    orderedIds: [],
    groundPending: null,
    airDominant: scenario.airDominant ?? "ochre",
    specials: { ...(scenario.specials ?? {}) },
    labels: {
      ochre: scenario.ochre.label,
      teal: scenario.teal.label,
    },
    turnCount: 0,
    log: [`${scenario.title}. ${SIDE_LABELS[scenario.firstPlayer]} plays first.`],
  };

  refreshObjectives(state);
  return state;
}

function applyPlayCard(state, action, side) {
  requirePhase(state, "play-card");
  const card = takeFromHand(state, side, action.cardId);
  if (card.family === "ambush") {
    throw new GameRuleError("Ambush is played during an enemy close assault.", "WRONG_PHASE");
  }
  state.discard.push(card.id);

  if (card.family === "counter-order") {
    if (!state.lastCard || state.lastCard.family === "counter-order") {
      throw new GameRuleError("There is no card to counter.", "NO_COUNTER");
    }
    const copied = cardById(state.lastCard.id);
    state.playedCard = copied.id;
    const override = {};
    if (copied.section === "left" || copied.section === "right") {
      override.section = oppositeSection(copied.section);
    } else if (copied.family === "infantry-push") {
      override.section = state.lastCard.section;
    }
    state.cardOverride = Object.keys(override).length ? override : null;
    addLog(state, `${SIDE_LABELS[side]} counters with ${copied.name}.`);
  } else {
    state.playedCard = card.id;
    if (card.family === "infantry-push") {
      if (!["left", "center", "right"].includes(action.section) && hasType(state, side, "infantry")) {
        throw new GameRuleError("Choose a section for Infantry Push.", "NEED_SECTION");
      }
      state.cardOverride = action.section ? { section: action.section } : null;
    }
    addLog(state, `${SIDE_LABELS[side]} plays ${card.name}.`);
  }

  const resolved = effectiveCard(state);
  if (resolved.family === "air-strike") state.phase = "air-strike";
  else if (resolved.family === "barrage") state.phase = "barrage";
  else if (resolved.family === "dig-in") state.phase = "dig-in";
  else if (resolved.family === "repair-party") state.phase = "repair";
  else if (resolved.family === "finest-hour") state.phase = "finest-hour";
  else state.phase = "select-orders";
}

function applySelectOrders(state, action, side) {
  requirePhase(state, "select-orders");
  const unitIds = action.unitIds ?? [];
  validateOrders(state, side, unitIds);
  resetTurnFlags(state);
  state.orderedIds = [...new Set(unitIds)];
  for (const id of state.orderedIds) {
    const unit = unitById(state, id);
    unit.ordered = true;
  }
  if (state.orderedIds.length === 0) {
    finishTurnDraw(state, side);
    return;
  }
  beginMoveOrBattle(state);
}

function applyMove(state, action, side) {
  requirePhase(state, "move");
  const unit = unitById(state, action.unitId);
  if (!unit || unit.side !== side) throw new GameRuleError("Unknown unit.", "UNKNOWN_UNIT");
  if (!unit.ordered) throw new GameRuleError("That unit was not ordered.", "NOT_ORDERED");
  if (unit.moved) throw new GameRuleError("That unit has already moved.", "ALREADY_MOVED");
  const dest = reachableTiles(state, unit.id)
    .find((hex) => hex.q === action.to?.q && hex.r === action.to?.r);
  if (!dest) throw new GameRuleError("That hex is not reachable.", "ILLEGAL_MOVE");

  const from = { q: unit.q, r: unit.r };
  const destTerrain = terrainAt(state, dest.q, dest.r);
  unit.q = dest.q;
  unit.r = dest.r;
  unit.moved = true;
  unit.movedHexes = dest.cost;
  if (TERRAIN[destTerrain]?.noBattleOnEnter) unit.enteredCover = true;
  const wire = obstacleAt(state, dest.q, dest.r);
  if (wire?.type === "wire" && unit.type === "armor") {
    state.obstacles = state.obstacles.filter((item) => item !== wire);
    addLog(state, `${UNIT_TYPES[unit.type].label} cleared wire.`);
  }
  removeSandbagsIfEmpty(state, from.q, from.r);
  refreshObjectives(state);
  checkVictory(state);
  addLog(state, `${SIDE_LABELS[side]} moved ${UNIT_TYPES[unit.type].label} to ${String.fromCharCode(65 + dest.q)}${dest.r + 1}.`);

  if (state.deepPatrolExit === unit.id) {
    unit.moved = true;
    state.deepPatrolExit = "done";
    state.phase = "battle";
  }
}

function applyEndMoves(state, side) {
  requirePhase(state, "move");
  for (const id of state.orderedIds) {
    const unit = unitById(state, id);
    if (unit && !unit.moved) unit.moved = true;
  }
  if (state.deepPatrolExit && state.deepPatrolExit !== "done") {
    state.deepPatrolExit = "done";
  }
  state.phase = "battle";
  const card = effectiveCard(state);
  if (card?.family === "gun-line") {
    for (const id of state.orderedIds) {
      const unit = unitById(state, id);
      if (unit?.type === "artillery" && unit.movedHexes === 0) state.secondShot = unit.id;
    }
  }
}

function applyCutWire(state, action, side) {
  requirePhase(state, "battle");
  const unit = unitById(state, action.unitId);
  if (!unit || unit.side !== side || !unit.ordered) {
    throw new GameRuleError("That unit cannot cut wire.", "NOT_ORDERED");
  }
  if (unit.type !== "infantry") throw new GameRuleError("Only infantry cut wire.", "WRONG_TYPE");
  const wire = obstacleAt(state, unit.q, unit.r);
  if (wire?.type !== "wire") throw new GameRuleError("There is no wire here.", "NO_WIRE");
  state.obstacles = state.obstacles.filter((item) => item !== wire);
  unit.battled = true;
  addLog(state, "Infantry cut the wire.");
}

function applyBattle(state, action, side) {
  requirePhase(state, "battle", "overrun");
  const attacker = unitById(state, action.unitId);
  if (!attacker || attacker.side !== side) throw new GameRuleError("Unknown unit.", "UNKNOWN_UNIT");
  if (!attacker.ordered) throw new GameRuleError("That unit was not ordered.", "NOT_ORDERED");
  if (attacker.battled && state.phase !== "overrun" && state.secondShot !== "ready") {
    throw new GameRuleError("That unit has already battled.", "ALREADY_BATTLED");
  }
  const targets = legalTargets(state, attacker.id);
  const target = targets.find((unit) => unit.id === action.targetId);
  if (!target) throw new GameRuleError("That target is not legal.", "ILLEGAL_TARGET");

  const range = hexDistance(attacker, target);
  const close = range === 1;
  const extras = {};
  if (effectiveCard(state)?.family === "barrage") extras.fixedDice = 4;
  const dice = battleDiceCount(state, attacker, target, extras);
  requireRolls(action, dice);
  const faces = facesFromRolls(action.rolls);
  const targetHex = { q: target.q, r: target.r };
  const result = applyHitsAndFlags(state, target, faces, side, {
    retreatPerFlag: isResistance(target) ? (action.retreatPerFlag ?? 1) : 1,
  });
  attacker.battled = true;
  if (state.secondShot === attacker.id) state.secondShot = "fired-once";
  else if (state.secondShot === "ready" && attacker.type === "artillery") {
    attacker.battled = true;
    state.secondShot = "done";
  }

  if (state.phase === "finished") return;
  if (result.vacated || result.eliminated) {
    const took = maybeTakeGround(state, attacker, targetHex, close);
    if (took) return;
  }
  finishUnitBattle(state, attacker);
}

function applyTakeGround(state, action, side) {
  requirePhase(state, "ground");
  const pending = state.groundPending;
  if (!pending) throw new GameRuleError("No advance is pending.", "NO_GROUND");
  const unit = unitById(state, pending.unitId);
  if (!unit || unit.side !== side) throw new GameRuleError("Unknown unit.", "UNKNOWN_UNIT");
  const from = { q: unit.q, r: unit.r };
  unit.q = pending.q;
  unit.r = pending.r;
  unit.tookGround = true;
  removeSandbagsIfEmpty(state, from.q, from.r);
  refreshObjectives(state);
  checkVictory(state);
  addLog(state, `${SIDE_LABELS[side]} took ground.`);
  if (action.overrun && pending.canOverrun) {
    unit.overran = true;
    unit.battled = false;
    state.groundPending = null;
    state.phase = "overrun";
    return;
  }
  state.groundPending = null;
  state.phase = "battle";
  finishUnitBattle(state, unit);
}

function applySkipGround(state, side) {
  requirePhase(state, "ground");
  const pending = state.groundPending;
  const unit = pending ? unitById(state, pending.unitId) : null;
  state.groundPending = null;
  state.phase = "battle";
  if (unit) finishUnitBattle(state, unit);
}

function applyEndBattles(state, side) {
  requirePhase(state, "battle");
  finishTurnDraw(state, side);
}

function applyDrawKeep(state, action, side) {
  requirePhase(state, "draw-keep");
  const pending = state.drawPending ?? [];
  if (!pending.includes(action.keepId)) {
    throw new GameRuleError("Keep one of the cards you just drew.", "BAD_KEEP");
  }
  for (const id of pending) {
    if (id !== action.keepId) {
      state.hands[side] = state.hands[side].filter((cardId) => cardId !== id);
      state.discard.push(id);
    }
  }
  completeTurn(state);
}

function applyAirStrike(state, action, side) {
  requirePhase(state, "air-strike");
  const hexes = action.hexes ?? [];
  if (hexes.length === 0 || hexes.length > 4) {
    throw new GameRuleError("Choose 1 to 4 contiguous enemy hexes.", "BAD_TARGETS");
  }
  const seen = new Set();
  const occupied = [];
  for (const hex of hexes) {
    const key = tileKey(hex.q, hex.r);
    if (seen.has(key)) throw new GameRuleError("Duplicate hex.", "BAD_TARGETS");
    seen.add(key);
    const unit = unitAt(state, hex.q, hex.r);
    if (!unit || unit.side === side) throw new GameRuleError("Each hex must hold an enemy.", "BAD_TARGETS");
    occupied.push(unit);
  }
  for (const hex of hexes) {
    const connected = hexes.some((other) => other !== hex && hexDistance(hex, other) === 1);
    if (hexes.length > 1 && !connected) {
      const clusterOk = hexes.every((candidate) => (
        hexes.some((other) => other !== candidate && hexDistance(candidate, other) === 1)
      ));
      if (!clusterOk) throw new GameRuleError("Air Strike hexes must be contiguous.", "BAD_TARGETS");
    }
  }
  const per = side === state.airDominant ? 2 : 1;
  requireRolls(action, per * hexes.length);
  state.flagsCannotIgnore = true;
  for (let i = 0; i < hexes.length; i += 1) {
    const unit = unitAt(state, hexes[i].q, hexes[i].r);
    if (!unit) continue;
    const slice = action.rolls.slice(i * per, i * per + per);
    applyHitsAndFlags(state, unit, facesFromRolls(slice), side, {
      starsHit: true,
      unitSymbolsHit: true,
    });
    if (state.phase === "finished") return;
  }
  state.flagsCannotIgnore = false;
  finishTurnDraw(state, side);
}

function applyBarrage(state, action, side) {
  requirePhase(state, "barrage");
  const target = unitById(state, action.targetId);
  if (!target || target.side === side) throw new GameRuleError("Choose an enemy unit.", "ILLEGAL_TARGET");
  requireRolls(action, 4);
  state.flagsCannotIgnore = true;
  const faces = facesFromRolls(action.rolls);
  const hits = [];
  const flags = [];
  for (const face of faces) {
    if (face === "grenade" || symbolMatchesUnit(face, target.type)) hits.push(face);
    else if (face === "flag") flags.push(face);
  }
  applyHitsAndFlags(state, target, [...hits, ...flags], side);
  state.flagsCannotIgnore = false;
  finishTurnDraw(state, side);
}

function applyDigIn(state, action, side) {
  requirePhase(state, "dig-in");
  const ids = action.unitIds ?? [];
  if (hasType(state, side, "infantry")) {
    if (ids.length > 4) throw new GameRuleError("Dig In covers at most 4 infantry.", "TOO_MANY_ORDERS");
    for (const id of ids) {
      const unit = unitById(state, id);
      if (!unit || unit.side !== side || unit.type !== "infantry") {
        throw new GameRuleError("Dig In only entrenchs your infantry.", "ILLEGAL_ORDER");
      }
      if (!obstacleAt(state, unit.q, unit.r)) {
        state.obstacles.push({
          id: `sandbag-${unit.id}-${state.turnCount}`,
          type: "sandbag",
          q: unit.q,
          r: unit.r,
        });
      }
    }
  } else {
    state.phase = "select-orders";
    applySelectOrders(state, { unitIds: ids.slice(0, 1) }, side);
    return;
  }
  addLog(state, `${SIDE_LABELS[side]} dug in.`);
  finishTurnDraw(state, side);
}

function applyRepair(state, action, side) {
  requirePhase(state, "repair");
  const unit = unitById(state, action.unitId);
  if (!unit || unit.side !== side) throw new GameRuleError("Choose one of your damaged units.", "UNKNOWN_UNIT");
  if (unit.figures >= unit.figuresMax) throw new GameRuleError("That unit is at full strength.", "NOT_DAMAGED");
  const dice = state.hands[side].length + 1;
  requireRolls(action, dice);
  let restored = 0;
  for (const face of facesFromRolls(action.rolls)) {
    if (face === "star" || symbolMatchesUnit(face, unit.type)) restored += 1;
  }
  unit.figures = Math.min(unit.figuresMax, unit.figures + restored);
  addLog(state, `Repair Party restored ${Math.min(restored, unit.figuresMax)} figure(s).`);
  if (restored > 0) {
    resetTurnFlags(state);
    unit.ordered = true;
    state.orderedIds = [unit.id];
    state.phase = "move";
    return;
  }
  finishTurnDraw(state, side);
}

function applyFinestHour(state, action, side) {
  requirePhase(state, "finest-hour");
  const dice = state.hands[side].length + 1;
  requireRolls(action, dice);
  if (!Array.isArray(action.reshuffleOrder)) {
    throw new GameRuleError("Finest Hour needs a reshuffled deck.", "RESHUFFLE_REQUIRED", { needsReshuffle: true });
  }
  const faces = facesFromRolls(action.rolls);
  const assigned = action.assignments ?? {};
  const ordered = [];
  faces.forEach((face, index) => {
    if (face === "flag") return;
    const unitId = assigned[index] ?? assigned[String(index)];
    if (!unitId) return;
    const unit = unitById(state, unitId);
    if (!unit || unit.side !== side) throw new GameRuleError("Finest Hour assignment is illegal.", "ILLEGAL_ORDER");
    if (face !== "star" && !symbolMatchesUnit(face, unit.type) && !(face === "grenade" && unit.type === "artillery")) {
      throw new GameRuleError("That die does not order that unit.", "ILLEGAL_ORDER");
    }
    if (!ordered.includes(unitId)) ordered.push(unitId);
  });
  const remaining = new Set([...state.deck, ...state.discard]);
  if (action.reshuffleOrder.length !== remaining.size
    || action.reshuffleOrder.some((id) => !remaining.has(id))) {
    throw new GameRuleError("Reshuffle must use the discard and leftover deck.", "BAD_RESHUFFLE");
  }
  state.deck = [...action.reshuffleOrder];
  state.discard = [];
  resetTurnFlags(state);
  state.finestHourIds = ordered;
  state.orderedIds = ordered;
  for (const id of ordered) unitById(state, id).ordered = true;
  if (ordered.length === 0) {
    finishTurnDraw(state, side);
    return;
  }
  state.phase = "move";
}

function applyResign(state, side) {
  state.phase = "finished";
  state.winner = otherSide(side);
  state.winReason = "resign";
  addLog(state, `${SIDE_LABELS[side]} resigned.`);
}

export function applyAction(currentState, action, actorSide = currentState.activeSide) {
  const state = cloneGame(currentState);
  if (state.phase === "finished" && action?.type !== "resign") {
    throw new GameRuleError("This match has finished.", "MATCH_FINISHED");
  }
  if (!action || typeof action.type !== "string") {
    throw new GameRuleError("An action type is required.", "MALFORMED_ACTION");
  }

  if (action.type !== "react-ambush") requireSide(state, actorSide);

  switch (action.type) {
    case "play-card":
      applyPlayCard(state, action, actorSide);
      break;
    case "select-orders":
      applySelectOrders(state, action, actorSide);
      break;
    case "move":
      applyMove(state, action, actorSide);
      break;
    case "end-moves":
      applyEndMoves(state, actorSide);
      break;
    case "battle":
      applyBattle(state, action, actorSide);
      break;
    case "cut-wire":
      applyCutWire(state, action, actorSide);
      break;
    case "take-ground":
      applyTakeGround(state, action, actorSide);
      break;
    case "skip-ground":
      applySkipGround(state, actorSide);
      break;
    case "end-battles":
      applyEndBattles(state, actorSide);
      break;
    case "draw-keep":
      applyDrawKeep(state, action, actorSide);
      break;
    case "air-strike":
      applyAirStrike(state, action, actorSide);
      break;
    case "barrage":
      applyBarrage(state, action, actorSide);
      break;
    case "dig-in":
      applyDigIn(state, action, actorSide);
      break;
    case "repair":
      applyRepair(state, action, actorSide);
      break;
    case "finest-hour":
      applyFinestHour(state, action, actorSide);
      break;
    case "resign":
      applyResign(state, actorSide);
      break;
    default:
      throw new GameRuleError("That action is not supported.", "UNKNOWN_ACTION");
  }

  return state;
}

export function viewFor(state, side) {
  const view = cloneGame(state);
  const hidden = otherSide(side);
  view.hands[hidden] = view.hands[hidden].map(() => "hidden");
  view.opponentHandCount = state.hands[hidden].length;
  view.deckCount = state.deck.length;
  view.deck = state.deck.map(() => "hidden");
  return view;
}

export function canIssueOrders(state, side) {
  return state.phase !== "finished" && state.phase !== "play-card" && state.activeSide === side;
}
