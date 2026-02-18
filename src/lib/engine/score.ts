import type { MetricKey } from "@/lib/types";

export function cosineSimilarity(a: Record<MetricKey, number>, b: Record<MetricKey, number>): number {
  let dot = 0;
  let n1 = 0;
  let n2 = 0;

  for (const key in a) {
    const av = a[key as MetricKey] ?? 0;
    const bv = b[key as MetricKey] ?? 0;
    dot += av * bv;
    n1 += av * av;
    n2 += bv * bv;
  }

  if (n1 === 0 || n2 === 0) return 0;
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

export function weightedCloseness(
  actual: Record<MetricKey, number>,
  target: Record<MetricKey, number>,
  weights: Record<MetricKey, number>
): number {
  let score = 0;
  for (const key in target) {
    const metric = key as MetricKey;
    const diff = Math.abs((actual[metric] ?? 50) - target[metric]);
    const closeness = 1 - Math.min(diff, 100) / 100;
    score += weights[metric] * closeness;
  }
  return score;
}
