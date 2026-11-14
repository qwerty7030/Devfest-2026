const PREFIXES = [
  "drip", "fit", "styl", "thrift", "vintage", "kicks", "y2k", "street", "lux", "denim",
  "sneaker", "closet", "outfit", "fashion", "archive", "grail", "cozy", "baggy", "clean", "mood",
];
const SUFFIXES = [
  "inspector", "queen", "king", "daily", "hunter", "lover", "addict", "head", "club", "police",
  "girl", "boy", "files", "diaries", "era", "check", "core", "szn", "only", "gang",
];
const NAMES = [
  "mari", "jay", "kenji", "ava", "leo", "zara", "nico", "tasha", "omar", "lina",
  "dre", "suki", "mateo", "priya", "kai", "bella", "theo", "nia", "ezra", "yuki",
];

const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

export function randomUsername(): string {
  const n = Math.random();
  const num = Math.random() < 0.4 ? String(Math.floor(Math.random() * 999)) : "";
  if (n < 0.33) return `${pick(PREFIXES)}_${pick(SUFFIXES)}${num}`;
  if (n < 0.66) return `${pick(NAMES)}.${pick(PREFIXES)}${num}`;
  return `${pick(PREFIXES)}by${pick(NAMES)}${num}`;
}

let counter = 0;
export function newId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}
