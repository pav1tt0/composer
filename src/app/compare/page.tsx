"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Candidate } from "@/lib/types";
import { parseStoredCandidates } from "@/lib/compare-storage";

type Row = { key: string; label: string; get: (c: Candidate) => number | string };

function bestWorst(values: number[]): { best: number; worst: number } {
  let best = -Infinity;
  let worst = Infinity;
  for (const v of values) {
    if (v > best) best = v;
    if (v < worst) worst = v;
  }
  return { best, worst };
}

function CompareContent() {
  const params = useSearchParams();
  const idsParam = params.get("ids") ?? "";
  const selectedRanks = idsParam
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isFinite(x));

  const selected = useMemo(() => {
    if (typeof window === "undefined") return [] as Candidate[];
    const raw = localStorage.getItem("amc_last_candidates");
    const all = parseStoredCandidates(raw);
    return all.filter((c) => selectedRanks.includes(c.rank)).slice(0, 4);
  }, [idsParam]);

  const rows: Row[] = [
    { key: "composition", label: "Composition", get: (c) => c.composition.map((p) => `${p.pct}% ${p.name}`).join(" + ") },
    { key: "durability", label: "Durability", get: (c) => c.predicted_properties.durability },
    { key: "breathability", label: "Breathability", get: (c) => c.predicted_properties.breathability },
    { key: "elasticity", label: "Elasticity", get: (c) => c.predicted_properties.elasticity },
    { key: "softness", label: "Softness", get: (c) => c.predicted_properties.softness },
    { key: "thermal", label: "Thermal regulation", get: (c) => c.predicted_properties.thermal_regulation },
    { key: "lightness", label: "Weight lightness", get: (c) => c.predicted_properties.weight_lightness },
    { key: "co2", label: "CO2 kg/kg", get: (c) => c.predicted_lca.co2_kg_per_kg },
    { key: "water", label: "Water L/kg", get: (c) => c.predicted_lca.water_l_per_kg },
    { key: "energy", label: "Energy MJ/kg", get: (c) => c.predicted_lca.energy_mj_per_kg },
    { key: "perf", label: "Performance score (0-10)", get: (c) => c.scores.performance_0_10 },
    { key: "sust", label: "Sustainability score (0-10)", get: (c) => c.scores.sustainability_0_10 },
    { key: "feas", label: "Feasibility score (0-10)", get: (c) => c.scores.feasibility_0_10 },
    { key: "overall", label: "Overall (0-100)", get: (c) => c.scores.overall_0_100 }
    ,
    { key: "circ", label: "Circularity score (0-10)", get: (c) => c.circularity?.circularity_score ?? 0 },
    { key: "eol", label: "EOL pathway", get: (c) => (c.circularity?.eol_pathway ?? "UNKNOWN").replaceAll("_", " ") }
  ];

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 className="card-title" style={{ margin: 0 }}>Compare Candidates</h2>
        <Link className="action-link" href="/">Back to Composer</Link>
      </div>

      {selected.length < 2 ? <p className="error">Select at least 2 candidates from Composer to compare.</p> : null}

      {selected.length >= 2 ? (
        <div style={{ overflowX: "auto" }}>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Metric</th>
                {selected.map((c) => (
                  <th key={c.rank}>Candidate #{c.rank}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const vals = selected.map((c) => row.get(c));
                const numeric = vals.every((x) => typeof x === "number");
                const bw = numeric ? bestWorst(vals as number[]) : null;

                return (
                  <tr key={row.key}>
                    <td>{row.label}</td>
                    {vals.map((val, idx) => {
                      const isBest = numeric && Number(val) === bw?.best;
                      const isWorst = numeric && Number(val) === bw?.worst;
                      return (
                        <td key={`${row.key}-${selected[idx].rank}`} className={isBest ? "best-cell" : isWorst ? "worst-cell" : ""}>
                          {typeof val === "number" ? Number(val).toFixed(1) : val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<section className="card"><small className="muted">Loading compare view...</small></section>}>
      <CompareContent />
    </Suspense>
  );
}
