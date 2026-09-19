export const DIE_FACES = Object.freeze(["infantry", "infantry", "armor", "grenade", "star", "flag"]);

export const FACE_FROM_ROLL = Object.freeze({
  1: "infantry",
  2: "infantry",
  3: "armor",
  4: "grenade",
  5: "star",
  6: "flag",
});

export function facesFromRolls(rolls) {
  if (!Array.isArray(rolls)) return [];
  return rolls.map((value) => {
    const face = FACE_FROM_ROLL[value];
    if (!face) throw new Error(`Die roll must be 1-6, got ${value}.`);
    return face;
  });
}

export function hitsTarget(face, targetType, options = {}) {
  const starsHit = options.starsHit === true;
  if (face === "grenade") return true;
  if (face === "star") return starsHit;
  if (face === "flag") return false;
  if (targetType === "infantry" && face === "infantry") return true;
  if (targetType === "armor" && face === "armor") return true;
  if (options.unitSymbolsHit === true && (face === "infantry" || face === "armor")) return true;
  return false;
}

export function symbolMatchesUnit(face, unitType) {
  if (unitType === "infantry") return face === "infantry";
  if (unitType === "armor") return face === "armor";
  if (unitType === "artillery") return face === "grenade";
  return false;
}
