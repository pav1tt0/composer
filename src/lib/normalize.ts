import { ALL_METRICS, type MetricKey, type SlidersInput, type WeightsInput } from "@/lib/types";

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

export function normalizeSliders(sliders: SlidersInput): Record<MetricKey, number> {
  const out = {} as Record<MetricKey, number>;
  for (const key of ALL_METRICS) {
    out[key] = clamp(sliders[key] ?? 50);
  }
  return out;
}

export function normalizeWeights(weights?: WeightsInput): Record<MetricKey, number> {
  const raw = {} as Record<MetricKey, number>;
  let sum = 0;

  for (const key of ALL_METRICS) {
    const w = clamp(weights?.[key] ?? 1, 0.01, 1000);
    raw[key] = w;
    sum += w;
  }

  for (const key of ALL_METRICS) {
    raw[key] = raw[key] / sum;
  }

  return raw;
}
