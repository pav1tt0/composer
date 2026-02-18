import { z } from "zod";
import { ALL_METRICS, type MetricKey } from "@/lib/types";

const metricShape = Object.fromEntries(ALL_METRICS.map((key) => [key, z.number()])) as Record<MetricKey, z.ZodNumber>;

const metricValueSchema = z.preprocess(
  (value) => (Number.isFinite(Number(value)) ? Number(value) : undefined),
  z.number().min(0).max(100)
);
const weightValueSchema = z.preprocess(
  (value) => (Number.isFinite(Number(value)) ? Number(value) : undefined),
  z.number().positive()
);

const metricInputShape = Object.fromEntries(ALL_METRICS.map((key) => [key, metricValueSchema.optional()])) as Record<
  MetricKey,
  z.ZodOptional<typeof metricValueSchema>
>;
const metricWeightShape = Object.fromEntries(ALL_METRICS.map((key) => [key, weightValueSchema.optional()])) as Record<
  MetricKey,
  z.ZodOptional<typeof weightValueSchema>
>;

const compositionPartSchema = z.object({
  material_id: z.string().min(1),
  name: z.string().min(1),
  pct: z.number().min(0).max(100)
});

export const optimizeCandidateSchema = z
  .object({
    rank: z.number().int().positive(),
    score: z.number(),
    predicted_properties: z.object(metricShape),
    predicted_lca: z.object({
      co2_kg_per_kg: z.number(),
      water_l_per_kg: z.number(),
      energy_mj_per_kg: z.number()
    })
  })
  .passthrough();

export const optimizeSchema = z.object({
  objective: z.enum(["min_co2", "min_cost", "max_durability"]),
  candidates: z.array(optimizeCandidateSchema).min(1).max(20)
});

const candidateSchema = z
  .object({
    rank: z.number().int().positive(),
    score: z.number(),
    composition: z.array(compositionPartSchema).min(2),
    predicted_properties: z.object(metricShape),
    predicted_lca: z.object({
      co2_kg_per_kg: z.number(),
      water_l_per_kg: z.number(),
      energy_mj_per_kg: z.number()
    }),
    feasibility: z.object({
      trl_est: z.number(),
      supply_risk: z.enum(["low", "medium", "high"])
    }),
    circularity: z.object({
      recyclability_score: z.number(),
      separation_difficulty: z.number(),
      microplastic_risk: z.number(),
      eol_pathway: z.enum(["MECHANICAL_RECYCLING", "CHEMICAL_RECYCLING", "INDUSTRIAL_COMPOST", "LANDFILL_RISK", "UNKNOWN"]),
      circularity_score: z.number(),
      notes: z.array(z.string())
    })
  })
  .passthrough();

const inputSchema = z.object({
  use_case: z.string().min(1),
  use_case_id: z.string().min(1).optional(),
  sliders: z.object(metricInputShape).partial(),
  weights: z.object(metricWeightShape).partial().optional(),
  constraints: z
    .object({
      must_biodegradable: z.boolean().optional(),
      no_animal_fibers: z.boolean().optional(),
      max_microplastic_risk: z.enum(["low", "medium", "high"]).optional(),
      max_cost: z.number().optional()
    })
    .optional()
});

export const recyclableAlternativeBodySchema = z.object({
  input: inputSchema,
  candidate: candidateSchema
});
