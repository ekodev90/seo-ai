import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { settingsService, type SettingsKey } from "@/server/services/settingsService";
import { SettingsForm } from "./settings-form";

async function getSettings(userId: string): Promise<Record<string, string>> {
  return settingsService.getAll(userId);
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) return null;

  const currentSettings = await getSettings(session.user.id);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          API Keys & Integrations
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Keys are encrypted at rest with AES-256-GCM.
        </p>

        <SettingsForm initialValues={currentSettings} />
      </div>
    </div>
  );
}
