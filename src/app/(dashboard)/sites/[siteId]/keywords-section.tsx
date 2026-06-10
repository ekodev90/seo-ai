"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Keyword {
  id: string;
  phrase: string;
  source: "manual" | "gsc";
}

export function KeywordsSection({
  siteId,
  keywords,
}: {
  siteId: string;
  keywords: Keyword[];
}) {
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) return;
    setAdding(true);

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: siteId, phrase: phrase.trim() }),
      });
      if (res.ok) {
        setPhrase("");
        setShowForm(false);
        router.refresh();
      }
    } catch {
      // ignore
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (keywordId: string) => {
    await fetch(`/api/keywords?id=${keywordId}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Keywords
        </h2>
        <span className="text-sm text-gray-400">
          {keywords.length} tracked
        </span>
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          + Add Keyword
        </button>
      ) : (
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="Enter keyword phrase…"
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={adding || !phrase.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </form>
      )}

      {keywords.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No keywords tracked. Add keywords or connect GSC for auto-import.
        </p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {keywords.map((kw) => (
            <div
              key={kw.id}
              className="flex items-center justify-between px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm text-gray-900 dark:text-white truncate">
                  {kw.phrase}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    kw.source === "gsc"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {kw.source}
                </span>
              </div>
              <button
                onClick={() => handleDelete(kw.id)}
                className="text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
