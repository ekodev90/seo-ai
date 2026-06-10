"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddLinkForm({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [show, setShow] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setAdding(true);

    try {
      const res = await fetch(`/api/sites/${siteId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, label: label || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add link");
      }

      setUrl("");
      setLabel("");
      setShow(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        + Add Alternative Link
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} className="flex items-end gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1">URL *</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
          placeholder="https://mirror.example.com"
        />
      </div>
      <div className="w-32">
        <label className="block text-xs text-gray-500 mb-1">Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
          placeholder="Mirror"
        />
      </div>
      <button
        type="submit"
        disabled={adding}
        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition-colors"
      >
        {adding ? "…" : "Add"}
      </button>
      <button
        type="button"
        onClick={() => setShow(false)}
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </form>
  );
}
