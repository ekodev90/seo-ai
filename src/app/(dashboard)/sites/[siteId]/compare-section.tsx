"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type Competitor = { id: string; url: string; label: string | null };
type Comparison = {
  id: string;
  metrics: Record<string, unknown>;
  aiReportId: string | null;
  createdAt: string;
};

export function CompareSection({
  siteId,
  competitors: initialCompetitors,
  comparisons: initialComparisons,
}: {
  siteId: string;
  competitors: Competitor[];
  comparisons: Comparison[];
}) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [comparing, setComparing] = useState<string | null>(null);

  const addCompetitor = async () => {
    if (!url) return;
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: siteId, url, label: label || null }),
    });
    if (res.ok) {
      setUrl("");
      setLabel("");
      setAdding(false);
      router.refresh();
    }
  };

  const removeCompetitor = async (id: string) => {
    await fetch(`/api/competitors?id=${id}`, { method: "DELETE" });
    setCompetitors(competitors.filter((c) => c.id !== id));
    router.refresh();
  };

  const startComparison = async (competitorId: string) => {
    setComparing(competitorId);
    await fetch("/api/comparisons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: siteId, competitorId }),
    });
    setComparing(null);
    router.refresh();
  };

  const latestComparison = initialComparisons[initialComparisons.length - 1];
  const metrics = latestComparison?.metrics as {
    mine: Record<string, unknown>;
    theirs: Record<string, unknown>;
  } | null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Competitors
        </h2>
        <button
          onClick={() => setAdding(!adding)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Competitor URL…"
            className="flex-1 px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600"
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
            className="w-32 px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600"
          />
          <button
            onClick={addCompetitor}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded"
          >
            Add
          </button>
        </div>
      )}

      {competitors.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Add competitor URLs to compare your site side-by-side.
        </p>
      ) : (
        <div className="space-y-2 mb-6">
          {competitors.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-900 dark:text-white truncate">
                  {c.label || c.url}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startComparison(c.id)}
                  disabled={comparing === c.id}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  {comparing === c.id ? "…" : "Compare"}
                </button>
                <button
                  onClick={() => removeCompetitor(c.id)}
                  className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison results */}
      {metrics && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Latest Comparison
          </h3>

          {/* Radar chart */}
          <div className="mb-4">
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart
                data={[
                  { name: "Audit", mine: (metrics.mine.audit as { score: number })?.score ?? 0, theirs: (metrics.theirs.audit as { score: number })?.score ?? 0 },
                  { name: "CWV", mine: cwvScore(metrics.mine.cwv as Record<string, number | null>), theirs: cwvScore(metrics.theirs.cwv as Record<string, number | null>) },
                  { name: "PSI", mine: (metrics.mine.psi as { mobileScore: number | null })?.mobileScore ?? 0, theirs: (metrics.theirs.psi as { mobileScore: number | null })?.mobileScore ?? 0 },
                  { name: "SERP", mine: serpScore((metrics.mine as { serpPosition: number | null }).serpPosition), theirs: serpScore((metrics.theirs as { serpPosition: number | null }).serpPosition) },
                  { name: "AIO", mine: (metrics.mine as { aiOverviewCited: boolean }).aiOverviewCited ? 100 : 0, theirs: (metrics.theirs as { aiOverviewCited: boolean }).aiOverviewCited ? 100 : 0 },
                ]}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} />
                <Radar name="You" dataKey="mine" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Radar name="Competitor" dataKey="theirs" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — per-dimension diff */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { name: "Audit Score", mine: (metrics.mine.audit as { score: number })?.score ?? 0, theirs: (metrics.theirs.audit as { score: number })?.score ?? 0 },
                { name: "PSI Mobile", mine: (metrics.mine.psi as { mobileScore: number | null })?.mobileScore ?? 0, theirs: (metrics.theirs.psi as { mobileScore: number | null })?.mobileScore ?? 0 },
              ]}
              layout="vertical"
              margin={{ left: 80 }}
            >
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={75} />
              <Tooltip />
              <Bar dataKey="mine" fill="#3b82f6" name="You" barSize={12} />
              <Bar dataKey="theirs" fill="#ef4444" name="Competitor" barSize={12} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function cwvScore(cwv: Record<string, number | null>): number {
  let score = 100;
  if (cwv.lcpP75 && cwv.lcpP75 > 2500) score -= 25;
  if (cwv.inpP75 && cwv.inpP75 > 200) score -= 25;
  if (cwv.clsP75 && cwv.clsP75 > 0.1) score -= 25;
  if (cwv.ttfbP75 && cwv.ttfbP75 > 800) score -= 25;
  return Math.max(0, score);
}

function serpScore(pos: number | null): number {
  if (pos == null) return 0;
  if (pos <= 3) return 100;
  if (pos <= 10) return 70;
  if (pos <= 50) return 40;
  return 10;
}
