"use client";

import type { Candidate } from "@/lib/types";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const metricChartKeys = [
  "breathability",
  "elasticity",
  "durability",
  "softness",
  "thermal_regulation",
  "weight_lightness"
] as const;

export function ResultCard({ candidate }: { candidate: Candidate }) {
  const safe = candidate.predicted_properties ?? ({} as Candidate["predicted_properties"]);
  const data = metricChartKeys.map((k) => ({ key: k.replace("_", " "), value: Number(safe[k] ?? 0) }));
  const scores = candidate.scores ?? {
    performance_0_10: 0,
    sustainability_0_10: 0,
    feasibility_0_10: 0,
    overall_0_100: 0
  };
  const circularity = candidate.circularity ?? {
    recyclability_score: 0,
    separation_difficulty: 10,
    microplastic_risk: 10,
    eol_pathway: "UNKNOWN",
    circularity_score: 0,
    notes: []
  };

  return (
    <div className="card">
      <div className="result-header">
        <span className="result-title">Candidate #{candidate.rank}</span>
        <span className="badge">Score {Math.round(candidate.score * 100)}</span>
      </div>

      <p className="comp-line">{(candidate.composition ?? []).map((x) => `${x.pct}% ${x.name}`).join(" + ")}</p>

      <div className="score-strip">
        <div className="score-box">Perf {scores.performance_0_10.toFixed(1)}/10</div>
        <div className="score-box">Sust {scores.sustainability_0_10.toFixed(1)}/10</div>
        <div className="score-box">Feas {scores.feasibility_0_10.toFixed(1)}/10</div>
        <div className="score-box">Overall {scores.overall_0_100.toFixed(1)}</div>
      </div>

      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="2 4" stroke="#ced8d1" />
            <XAxis dataKey="key" interval={0} angle={-18} textAnchor="end" height={56} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#2f8a68" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="kpi-grid">
        <div className="kpi">CO2: {candidate.predicted_lca?.co2_kg_per_kg ?? "-"} kg/kg</div>
        <div className="kpi">Water: {candidate.predicted_lca?.water_l_per_kg ?? "-"} L/kg</div>
        <div className="kpi">Energy: {candidate.predicted_lca?.energy_mj_per_kg ?? "-"} MJ/kg</div>
      </div>

      <p className="metric-note">
        <strong>Feasibility:</strong> TRL {candidate.feasibility.trl_est} | supply {candidate.feasibility.supply_risk}
      </p>

      <div className="circularity-block">
        <div className="circularity-head">
          <strong>Circularity &amp; End-of-Life</strong>
          <span className="circularity-badge">{circularity.circularity_score.toFixed(1)}/10</span>
        </div>
        <div className="circularity-grid">
          <div className="kpi">Recyclability: {circularity.recyclability_score.toFixed(1)}/10</div>
          <div className="kpi">Separation diff.: {circularity.separation_difficulty.toFixed(1)}/10</div>
          <div className="kpi">Microplastic risk: {circularity.microplastic_risk.toFixed(1)}/10</div>
          <div className="kpi">EOL pathway: {circularity.eol_pathway.replaceAll("_", " ")}</div>
        </div>
        {circularity.notes?.length ? <small className="muted">Notes: {circularity.notes.join(" ")}</small> : null}
      </div>

      <p style={{ marginBottom: 8 }}>{candidate.explanation}</p>
      <small className="muted">Notes: {candidate.manufacturing_notes.join(" ")}</small>
    </div>
  );
}
