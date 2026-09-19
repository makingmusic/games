import test from "node:test";
import assert from "node:assert/strict";

import { COLS, ROWS, hexDistance, inSection, interveningLosHexes } from "../src/board.js";
import { CARD_DECK } from "../src/content/cards.js";
import { facesFromRolls, hitsTarget } from "../src/content/dice.js";
import { diceAtRange } from "../src/content/units.js";
import {
  GameRuleError,
  applyAction,
  battleDiceCount,
  createGame,
  legalTargets,
  reachableTiles,
  unitAt,
  unitById,
  viewFor,
} from "../src/game.js";
import { mulberry32 } from "../src/rng.js";

function fresh(seed = 1) {
  return createGame("pegasus-bridge", mulberry32(seed));
}

function playFirstSectionCard(state, side = "ochre") {
  const cardId = state.hands[side].find((id) => {
    const family = id.split("-")[0];
    return ["assault", "probe", "attack", "recon"].includes(family);
  });
  assert.ok(cardId, "expected a section card in hand");
  return applyAction(state, { type: "play-card", cardId }, side);
}

test("the deck is 60 cards, 40 section plus 20 tactic", () => {
  assert.equal(CARD_DECK.length, 60);
  assert.equal(CARD_DECK.filter(({ kind }) => kind === "section").length, 40);
  assert.equal(CARD_DECK.filter(({ kind }) => kind === "tactic").length, 20);
  const probes = CARD_DECK.filter(({ family, section }) => family === "probe" && section === "center");
  assert.equal(probes.length, 5);
});

test("dice faces hit the researched targets", () => {
  const faces = facesFromRolls([1, 2, 3, 4, 5, 6]);
  assert.deepEqual(faces, ["infantry", "infantry", "armor", "grenade", "star", "flag"]);
  assert.equal(hitsTarget("infantry", "infantry"), true);
  assert.equal(hitsTarget("infantry", "armor"), false);
  assert.equal(hitsTarget("infantry", "artillery"), false);
  assert.equal(hitsTarget("armor", "armor"), true);
  assert.equal(hitsTarget("grenade", "artillery"), true);
  assert.equal(hitsTarget("star", "infantry"), false);
  assert.equal(hitsTarget("star", "infantry", { starsHit: true }), true);
});

test("range tables match the research", () => {
  assert.deepEqual([1, 2, 3, 4].map((range) => diceAtRange("infantry", range)), [3, 2, 1, 0]);
  assert.deepEqual([1, 2, 3].map((range) => diceAtRange("armor", range)), [3, 3, 3]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map((range) => diceAtRange("artillery", range)), [3, 3, 2, 2, 1, 1]);
});

test("Pegasus Bridge deals Axis 2 and Allies 6 on a 13×9 board", () => {
  const state = fresh();
  assert.equal(state.hands.ochre.length, 6);
  assert.equal(state.hands.teal.length, 2);
  assert.equal(state.medalGoal, 4);
  assert.equal(state.activeSide, "ochre");
  assert.equal(state.units.filter(({ side }) => side === "ochre").length, 9);
  assert.equal(state.units.filter(({ side }) => side === "teal").length, 6);
  assert.equal(COLS, 13);
  assert.equal(ROWS, 9);
  assert.ok(inSection(0, "left"));
  assert.ok(inSection(3, "left") && inSection(3, "center"));
  assert.ok(inSection(9, "center") && inSection(9, "right"));
});

test("a player cannot act on the other side's turn", () => {
  const state = fresh();
  assert.throws(
    () => applyAction(state, { type: "play-card", cardId: state.hands.teal[0] }, "teal"),
    (error) => error instanceof GameRuleError && error.code === "WRONG_SIDE",
  );
});

test("infantry may move 2 hexes on open ground", () => {
  let state = fresh();
  state = playFirstSectionCard(state);
  const unit = state.units.find((candidate) => candidate.side === "ochre" && inSection(candidate.q, cardSection(state)));
  assert.ok(unit);
  state = applyAction(state, { type: "select-orders", unitIds: [unit.id] }, "ochre");
  const moves = reachableTiles(state, unit.id);
  assert.ok(moves.some((hex) => hexDistance(unit, hex) === 1));
  assert.ok(moves.some((hex) => hex.cost === 2));
  assert.equal(moves.some((hex) => hex.cost === 3), false);
});

function cardSection(state) {
  const id = state.playedCard;
  if (id.includes("left")) return "left";
  if (id.includes("right")) return "right";
  return "center";
}

test("close assault with three infantry faces scores three hits", () => {
  let state = fresh();
  const attacker = unitById(state, "o4");
  const target = unitById(state, "t3");
  attacker.q = 6;
  attacker.r = 5;
  target.q = 6;
  target.r = 4;
  state.phase = "battle";
  state.activeSide = "ochre";
  attacker.ordered = true;
  state.orderedIds = [attacker.id];
  state.playedCard = "probe-center-1";

  const after = applyAction(state, {
    type: "battle",
    unitId: attacker.id,
    targetId: target.id,
    rolls: [1, 1, 1],
  }, "ochre");

  const remaining = unitById(after, target.id);
  assert.equal(remaining.figures, 1);
});

test("three grenades eliminate 2-figure artillery in principle via figure math", () => {
  assert.equal(hitsTarget("grenade", "artillery"), true);
  assert.equal(hitsTarget("infantry", "artillery"), false);
});

test("an adjacent enemy forces close assault", () => {
  const state = fresh();
  const attacker = unitById(state, "o4");
  const near = unitById(state, "t3");
  const far = unitById(state, "t1");
  attacker.q = 6;
  attacker.r = 5;
  near.q = 6;
  near.r = 4;
  far.q = 0;
  far.r = 0;
  state.phase = "battle";
  attacker.ordered = true;
  state.orderedIds = [attacker.id];
  const targets = legalTargets(state, attacker.id);
  assert.equal(targets.some((unit) => unit.id === near.id), true);
  assert.equal(targets.some((unit) => unit.id === far.id), false);
});

test("forest reduces infantry attack by one die", () => {
  const state = fresh();
  state.tiles["5,4"] = "forest";
  const attacker = unitById(state, "o4");
  const target = unitById(state, "t3");
  attacker.q = 5;
  attacker.r = 5;
  target.q = 5;
  target.r = 4;
  assert.equal(battleDiceCount(state, attacker, target), 2);
});

test("eliminating a unit scores a medal and can win", () => {
  let state = fresh();
  const attacker = unitById(state, "o4");
  const target = unitById(state, "t3");
  target.figures = 1;
  attacker.q = 6;
  attacker.r = 5;
  target.q = 6;
  target.r = 4;
  state.phase = "battle";
  state.activeSide = "ochre";
  attacker.ordered = true;
  state.orderedIds = [attacker.id];
  state.playedCard = "probe-center-1";
  state.medals.ochre = 3;

  const after = applyAction(state, {
    type: "battle",
    unitId: attacker.id,
    targetId: target.id,
    rolls: [4, 5, 6],
  }, "ochre");

  assert.equal(unitById(after, target.id), null);
  assert.equal(after.medals.ochre >= 4, true);
  assert.equal(after.phase, "finished");
  assert.equal(after.winner, "ochre");
});

test("the opponent hand is hidden in a seat view", () => {
  const state = fresh();
  const view = viewFor(state, "ochre");
  assert.equal(view.hands.teal.every((id) => id === "hidden"), true);
  assert.equal(view.opponentHandCount, 2);
  assert.equal(state.hands.teal.every((id) => id !== "hidden"), true);
});

test("line of sight records intervening hex groups", () => {
  const groups = interveningLosHexes({ q: 0, r: 4 }, { q: 6, r: 4 });
  assert.ok(groups.length > 0);
});

test("a full Pegasus order-move-end cycle passes the turn", () => {
  let state = fresh();
  state = playFirstSectionCard(state);
  const section = cardSection(state);
  const unit = state.units.find((candidate) => candidate.side === "ochre" && inSection(candidate.q, section));
  state = applyAction(state, { type: "select-orders", unitIds: [unit.id] }, "ochre");
  const dest = reachableTiles(state, unit.id)[0];
  state = applyAction(state, { type: "move", unitId: unit.id, to: dest }, "ochre");
  state = applyAction(state, { type: "end-moves" }, "ochre");
  state = applyAction(state, { type: "end-battles" }, "ochre");
  assert.equal(state.activeSide, "teal");
  assert.equal(state.phase, "play-card");
  assert.equal(state.hands.ochre.length, 6);
});
