"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Candidate, MetricKey } from "@/lib/types";
import { ALL_METRICS } from "@/lib/types";
import { detectConflicts } from "@/lib/conflicts";
import { ResultCard } from "@/components/ResultCard";

const defaults: Partial<Record<MetricKey, number>> = {
  breathability: 70,
  elasticity: 45,
  durability: 65,
  softness: 62,
  thermal_regulation: 60,
  weight_lightness: 64,
  biodegradability: 72,
  microplastic_risk: 70,
  cost: 55
};

const priorityOptions: MetricKey[] = [
  "durability",
  "breathability",
  "softness",
  "elasticity",
  "biodegradability",
  "co2",
  "water",
  "energy",
  "cost"
];

function prettyMetric(key: string): string {
  return key.replaceAll("_", " ");
}

export default function ComposerPage() {
  const [useCase, setUseCase] = useState("Sportswear");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [values, setValues] = useState(defaults);
  const [mustBio, setMustBio] = useState(false);
  const [noAnimal, setNoAnimal] = useState(true);
  const [maxCost, setMaxCost] = useState(8);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [priorities, setPriorities] = useState<MetricKey[]>(["durability", "breathability", "biodegradability"]);
  const [similar, setSimilar] = useState<Record<number, string[]>>({});
  const [recyclableAlternatives, setRecyclableAlternatives] = useState<Record<number, Candidate>>({});
  const [compareRanks, setCompareRanks] = useState<number[]>([]);
  const resultsRef = useRef<HTMLElement | null>(null);

  const sliderEntries = useMemo(() => Object.entries(values), [values]);
  const conflicts = useMemo(() => detectConflicts(values), [values]);

  useEffect(() => {
    if (!candidates.length) return;
    localStorage.setItem("amc_last_candidates", JSON.stringify(candidates));
  }, [candidates]);

  function clampPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  function setSliderValue(key: string, value: number) {
    setValues((prev) => ({ ...prev, [key]: clampPercent(value) }));
  }

  function safeNumber(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
  }

  function buildWeights(): Partial<Record<MetricKey, number>> | undefined {
    if (!advancedMode) return undefined;
    const base = Object.fromEntries(ALL_METRICS.map((k) => [k, 1])) as Record<MetricKey, number>;
    for (const metric of priorities) {
      base[metric] = 3;
    }
    return base;
  }

  function togglePriority(metric: MetricKey): void {
    setPriorities((prev) => {
      if (prev.includes(metric)) return prev.filter((m) => m !== metric);
      if (prev.length >= 3) return [...prev.slice(1), metric];
      return [...prev, metric];
    });
  }

  function toggleCompare(rank: number): void {
    setCompareRanks((prev) => {
      if (prev.includes(rank)) return prev.filter((r) => r !== rank);
      if (prev.length >= 4) return prev;
      return [...prev, rank].sort((a, b) => a - b);
    });
  }

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          use_case: useCase,
          sliders: values,
          weights: buildWeights(),
          constraints: {
            must_biodegradable: mustBio,
            no_animal_fibers: noAnimal,
            max_microplastic_risk: "medium",
            max_cost: safeNumber(maxCost, 8)
          }
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generate failed");
      if (!Array.isArray(json.candidates)) throw new Error("Invalid generate response");

      setSessionId(json.session_id);
      setCandidates(json.candidates);
      setSimilar({});
      setRecyclableAlternatives({});
      setCompareRanks([]);
      if (typeof window !== "undefined" && window.innerWidth <= 1000) {
        window.requestAnimationFrame(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function optimize(objective: "min_co2" | "min_cost" | "max_durability") {
    const res = await fetch("/api/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objective, candidates })
    });
    const json = await res.json();
    if (res.ok) {
      setCandidates(json.candidates);
      setCompareRanks([]);
    }
  }

  async function onFindSimilar(candidate: Candidate) {
    const source = candidate.composition[0]?.material_id;
    if (!source) return;

    const res = await fetch("/api/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id: source, limit: 5 })
    });
    const json = await res.json();
    if (!res.ok) return;

    const names = (json.materials ?? []).map((m: { name: string }) => m.name);
    setSimilar((prev) => ({ ...prev, [candidate.rank]: names }));
  }

  async function onSuggestRecyclable(candidate: Candidate) {
    const res = await fetch("/api/recyclable-alternative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          use_case: useCase,
          sliders: values,
          weights: buildWeights(),
          constraints: {
            must_biodegradable: mustBio,
            no_animal_fibers: noAnimal,
            max_microplastic_risk: "medium",
            max_cost: safeNumber(maxCost, 8)
          }
        },
        candidate
      })
    });
    const json = await res.json();
    if (!res.ok || !json.alternative) return;
    setRecyclableAlternatives((prev) => ({ ...prev, [candidate.rank]: json.alternative }));
  }

  const canCompare = compareRanks.length >= 2 && compareRanks.length <= 4;

  return (
    <div className="grid grid-2">
      <section ref={resultsRef} className="grid results-stack">
        {!candidates.length ? (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 4 }}>No Results Yet</h3>
            <small className="muted">Run Generate to produce 3-8 candidate blends and compare performance vs impact.</small>
          </div>
        ) : null}

        {candidates.length ? (
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <strong>Compare mode: select 2 to 4 candidates</strong>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <small className="muted">Selected: {compareRanks.length}/4</small>
              <Link className={`action-link${canCompare ? "" : " action-link-disabled"}`} href={canCompare ? `/compare?ids=${compareRanks.join(",")}` : "#"}>
                Compare
              </Link>
            </div>
          </div>
        ) : null}

        {candidates.map((candidate) => (
          <div key={candidate.rank} className="result-wrap">
            <div className="compare-toggle-row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={compareRanks.includes(candidate.rank)}
                  onChange={() => toggleCompare(candidate.rank)}
                  disabled={!compareRanks.includes(candidate.rank) && compareRanks.length >= 4}
                />
                Compare candidate #{candidate.rank}
              </label>
            </div>
            <ResultCard candidate={candidate} />
            <div className="similar-row">
              <button className="ghost" onClick={() => onFindSimilar(candidate)}>Find similar</button>
              <button className="ghost" onClick={() => onSuggestRecyclable(candidate)}>Suggest more recyclable alternative</button>
              {similar[candidate.rank]?.length ? <small className="muted">Similar: {similar[candidate.rank].join(", ")}</small> : null}
            </div>
            {recyclableAlternatives[candidate.rank] ? (
              <div>
                <small className="muted">Recyclability-oriented alternative:</small>
                <ResultCard candidate={recyclableAlternatives[candidate.rank]} />
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="card composer-card">
        <h2 className="card-title">Composer</h2>
        <p className="card-subtitle">Input is secondary here: focus on results and compare mode.</p>

        <div className="control-group">
          <label>Use case</label>
          <select value={useCase} onChange={(e) => setUseCase(e.target.value)}>
            <option>Sportswear</option>
            <option>Denim</option>
            <option>Luxury</option>
            <option>Interior</option>
          </select>
        </div>

        <div className="control-group">
          <label className="check">
            <input type="checkbox" checked={advancedMode} onChange={(e) => setAdvancedMode(e.target.checked)} /> Advanced mode (Top 3 priorities)
          </label>
          {advancedMode ? (
            <div className="priority-grid">
              {priorityOptions.map((metric) => (
                <button
                  key={metric}
                  type="button"
                  className={`ghost priority-btn ${priorities.includes(metric) ? "selected" : ""}`}
                  onClick={() => togglePriority(metric)}
                >
                  {prettyMetric(metric)}
                </button>
              ))}
            </div>
          ) : null}
          {advancedMode ? <small className="muted">Selected priorities: {priorities.join(", ")}</small> : null}
        </div>

        <div className="control-group">
          {sliderEntries.map(([key, val]) => (
            <div className="range-row" key={key}>
              <div className="range-head">
                <label>{prettyMetric(key)}</label>
                <span className="range-value">{val}%</span>
              </div>
              <div className="range-inputs">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => setSliderValue(key, Number(e.target.value))}
                />
                <input
                  className="pct-input"
                  type="number"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => setSliderValue(key, Number(e.target.value))}
                  aria-label={`${key} percent`}
                />
              </div>
            </div>
          ))}
        </div>

        {conflicts.length ? (
          <div className="conflict-panel" aria-live="polite">
            <strong>Conflicts detected</strong>
            {conflicts.map((c) => (
              <div key={c.id} className={`conflict-item ${c.severity}`}>
                <div>{c.title}</div>
                <small>{c.detail}</small>
              </div>
            ))}
          </div>
        ) : null}

        <div className="toggles">
          <label className="check">
            <input type="checkbox" checked={mustBio} onChange={(e) => setMustBio(e.target.checked)} /> Must be biodegradable
          </label>
          <label className="check">
            <input type="checkbox" checked={noAnimal} onChange={(e) => setNoAnimal(e.target.checked)} /> No animal fibers
          </label>
          <label>Max cost EUR/kg</label>
          <input type="number" min={1} max={30} value={maxCost} onChange={(e) => setMaxCost(Number(e.target.value))} />
        </div>

        <div className="actions">
          <button className="primary" onClick={generate} disabled={loading}>{loading ? "Generating..." : "Generate"}</button>
          <button className="ghost" onClick={() => optimize("min_co2")} disabled={!candidates.length}>Min CO2</button>
          <button className="ghost" onClick={() => optimize("min_cost")} disabled={!candidates.length}>Min Cost</button>
          <button className="ghost" onClick={() => optimize("max_durability")} disabled={!candidates.length}>Max Durability</button>
          <Link className={`action-link${canCompare ? "" : " action-link-disabled"}`} href={canCompare ? `/compare?ids=${compareRanks.join(",")}` : "#"}>
            Compare selected
          </Link>
        </div>

        {sessionId ? <p><small className="muted">Session: {sessionId}</small></p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </div>
  );
}
