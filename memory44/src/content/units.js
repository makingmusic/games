export const SIDES = Object.freeze(["ochre", "teal"]);

export const SIDE_LABELS = Object.freeze({
  ochre: "Allies",
  teal: "Axis",
});

export const UNIT_TYPES = Object.freeze({
  infantry: Object.freeze({
    label: "Infantry",
    mark: "I",
    figures: 4,
    maxMove: 2,
    battleAfterMove: 1,
    rangeDice: Object.freeze([3, 2, 1]),
  }),
  armor: Object.freeze({
    label: "Armor",
    mark: "A",
    figures: 3,
    maxMove: 3,
    battleAfterMove: 3,
    rangeDice: Object.freeze([3, 3, 3]),
  }),
  artillery: Object.freeze({
    label: "Artillery",
    mark: "G",
    figures: 2,
    maxMove: 1,
    battleAfterMove: 0,
    rangeDice: Object.freeze([3, 3, 2, 2, 1, 1]),
  }),
});

export function printedFigures(unit) {
  if (unit.tags?.includes("elite-armor")) return 4;
  if (unit.tags?.includes("resistance")) return 3;
  if (unit.figuresMax) return unit.figuresMax;
  return UNIT_TYPES[unit.type].figures;
}

export function isSpecialForces(unit) {
  return unit.tags?.includes("special-forces") === true;
}

export function isResistance(unit) {
  return unit.tags?.includes("resistance") === true;
}

export function maxMoveFor(unit, cardMove = null) {
  if (cardMove?.max != null) return cardMove.max;
  return UNIT_TYPES[unit.type].maxMove;
}

export function battleAfterMoveFor(unit, cardMove = null) {
  if (cardMove?.battleAfter != null) return cardMove.battleAfter;
  if (isSpecialForces(unit) && unit.type === "infantry") return 2;
  return UNIT_TYPES[unit.type].battleAfterMove;
}

export function diceAtRange(unitType, range) {
  const table = UNIT_TYPES[unitType].rangeDice;
  if (range < 1 || range > table.length) return 0;
  return table[range - 1];
}
