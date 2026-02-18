export function makeId(prefix = "sess"): string {
  const seed = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${seed}`;
}
