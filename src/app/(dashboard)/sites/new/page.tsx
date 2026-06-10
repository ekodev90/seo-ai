"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [gscPropertyUrl, setGscPropertyUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, primaryUrl, gscPropertyUrl: gscPropertyUrl || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create site");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Add New Site</h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Site Name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="My Blog"
          />
        </div>

        <div>
          <label htmlFor="primaryUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Primary URL *
          </label>
          <input
            id="primaryUrl"
            type="url"
            value={primaryUrl}
            onChange={(e) => setPrimaryUrl(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label htmlFor="gsc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            GSC Property URL (optional)
          </label>
          <input
            id="gsc"
            type="text"
            value={gscPropertyUrl}
            onChange={(e) => setGscPropertyUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="sc-domain:example.com"
          />
          <p className="text-xs text-gray-400 mt-1">
            Used for Google Search Console integration. Use &quot;sc-domain:&quot; prefix for domain properties.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Saving…" : "Create Site"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
