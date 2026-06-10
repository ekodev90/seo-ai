"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS: { key: string; label: string; placeholder: string; sensitive: boolean }[] = [
  {
    key: "deepseek_api_key",
    label: "DeepSeek API Key",
    placeholder: "sk-...",
    sensitive: true,
  },
  {
    key: "serper_api_key",
    label: "Serper API Key (optional)",
    placeholder: "serper key",
    sensitive: true,
  },
  {
    key: "psi_api_key",
    label: "PageSpeed Insights API Key (optional)",
    placeholder: "AIza...",
    sensitive: true,
  },
  {
    key: "gsc_service_account_json",
    label: "GSC Service Account JSON (optional)",
    placeholder: '{"type": "service_account", ...}',
    sensitive: true,
  },
  {
    key: "rank_provider",
    label: "Rank Provider",
    placeholder: "scrape or serper",
    sensitive: false,
  },
  {
    key: "proxy_url",
    label: "Proxy URL (optional)",
    placeholder: "http://user:pass@proxy:8080",
    sensitive: true,
  },
];

interface SettingsFormProps {
  initialValues: Record<string, string>;
}

export function SettingsForm({ initialValues }: SettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of FIELDS) {
      init[f.key] = initialValues[f.key] || "";
    }
    return init;
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSave = async (key: string) => {
    setSaving(key);
    setMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: values[key] }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setMessage({ text: "Saved", type: "success" });
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage({ text: "Failed to save", type: "error" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`text-sm p-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {FIELDS.map((field) => (
        <div key={field.key} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
          </label>
          <div className="flex gap-2">
            <input
              type={field.sensitive ? "password" : "text"}
              value={values[field.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono"
            />
            <button
              onClick={() => handleSave(field.key)}
              disabled={saving === field.key}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving === field.key ? "…" : "Save"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
