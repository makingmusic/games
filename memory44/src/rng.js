export function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngInt(rng, minInclusive, maxExclusive) {
  return minInclusive + Math.floor(rng() * (maxExclusive - minInclusive));
}

export function shuffleInPlace(items, rng) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = rngInt(rng, 0, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function cryptoRng() {
  const bytes = new Uint32Array(1);
  return () => {
    crypto.getRandomValues(bytes);
    return bytes[0] / 4294967296;
  };
}
