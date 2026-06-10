"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AuditRow = {
  id: string;
  kind: string;
  status: string;
  score: number | null;
  summary: {
    totalFindings: number;
    critical: number;
    warning: number;
    info: number;
    pass: number;
  } | null;
  createdAt: string;
};

export function AuditSection({
  siteId,
  audits: initialAudits,
}: {
  siteId: string;
  audits: AuditRow[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [audits, setAudits] = useState(initialAudits);
  const [showAiReport, setShowAiReport] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    overview: string;
    tasks: Array<{ priority: string; effort: string; action: string }>;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const runAudit = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: siteId,
          targetUrl: window.prompt("Enter URL to audit:") || "",
        }),
      });
      if (res.ok) {
        router.refresh();
        // Reload audits
        const auditsRes = await fetch(`/api/audit?siteId=${siteId}`);
        setAudits(await auditsRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const generateReport = async (auditId: string) => {
    setShowAiReport(auditId);
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, websiteId: siteId }),
      });
      if (res.ok) setAiResult(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Audits</h2>
        <button
          onClick={runAudit}
          disabled={running}
          className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {running ? "Running…" : "Run Audit"}
        </button>
      </div>

      {audits.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No audits yet. Run your first on-page SEO audit.
        </p>
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <div
              key={audit.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      audit.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : audit.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {audit.status}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {audit.kind} · {new Date(audit.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {audit.score != null && (
                  <span
                    className={`text-lg font-bold ${
                      audit.score >= 90
                        ? "text-green-600"
                        : audit.score >= 70
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {audit.score}/100
                  </span>
                )}
              </div>

              {audit.summary && (
                <div className="flex gap-3 text-xs mb-3">
                  <span className="text-red-600">🔴 {audit.summary.critical}</span>
                  <span className="text-yellow-600">⚠ {audit.summary.warning}</span>
                  <span className="text-blue-600">ℹ {audit.summary.info}</span>
                  <span className="text-green-600">✓ {audit.summary.pass}</span>
                </div>
              )}

              {audit.status === "completed" && (
                <button
                  onClick={() => generateReport(audit.id)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  {showAiReport === audit.id && aiLoading
                    ? "Generating AI report…"
                    : showAiReport === audit.id && aiResult
                      ? "AI Report ✓"
                      : "Generate AI Improvement Plan"}
                </button>
              )}

              {showAiReport === audit.id && aiResult && (
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    {aiResult.overview}
                  </p>
                  {aiResult.tasks.length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {aiResult.tasks.map((t, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              t.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : t.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {t.priority}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{t.action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
