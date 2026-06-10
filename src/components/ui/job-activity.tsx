"use client";

import { useState, useEffect } from "react";

type JobRun = {
  id: string;
  jobName: string;
  status: string;
  message: string | null;
  startedAt: string;
  completedAt: string | null;
};

export function JobActivity() {
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => setRuns(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Poll every 30s
    const interval = setInterval(() => {
      fetch("/api/jobs")
        .then((r) => r.json())
        .then((data) => setRuns(data))
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading…</div>;

  if (!runs.length) {
    return <div className="text-sm text-gray-400 py-4">No job activity yet.</div>;
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {runs.slice(0, 20).map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                run.status === "completed"
                  ? "bg-green-500"
                  : run.status === "failed"
                    ? "bg-red-500"
                    : "bg-yellow-500 animate-pulse"
              }`}
            />
            <span className="text-gray-700 dark:text-gray-300 truncate">{run.jobName}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 text-gray-400">
            <span>{run.status}</span>
            <span>{new Date(run.startedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
