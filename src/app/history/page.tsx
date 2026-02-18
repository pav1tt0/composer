"use client";

import { useEffect, useState } from "react";

type HistorySession = {
  id: string;
  created_at: string;
  use_case: string;
  sliders?: Record<string, number>;
  sliders_json?: Record<string, number>;
  candidates?: unknown[];
};

export default function HistoryPage() {
  const [rows, setRows] = useState<HistorySession[]>([]);

  useEffect(() => {
    fetch("/api/history?limit=20")
      .then((r) => r.json())
      .then((json) => setRows(json.sessions ?? []))
      .catch(() => setRows([]));
  }, []);

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>History</h2>
      {!rows.length ? <small className="muted">No sessions yet.</small> : null}
      <div className="grid">
        {rows.map((row) => (
          <div key={row.id} style={{ borderBottom: "1px solid #e8ecef", paddingBottom: 8 }}>
            <strong>{row.use_case}</strong>
            <p style={{ margin: "4px 0" }}><small className="muted">{new Date(row.created_at).toLocaleString()}</small></p>
            <small className="muted">Session ID: {row.id}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
