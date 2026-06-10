import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/crypto";

export type SettingsKey =
  | "deepseek_api_key"
  | "serper_api_key"
  | "psi_api_key"
  | "gsc_service_account_json"
  | "rank_provider"
  | "proxy_url";

const SENSITIVE_KEYS: SettingsKey[] = [
  "deepseek_api_key",
  "serper_api_key",
  "psi_api_key",
  "gsc_service_account_json",
  "proxy_url",
];

export const settingsService = {
  /**
   * Store a setting value. Sensitive keys are encrypted at rest.
   */
  async set(userId: string, key: SettingsKey, value: string): Promise<void> {
    const shouldEncrypt = SENSITIVE_KEYS.includes(key);
    const valueEncrypted = shouldEncrypt ? await encrypt(value) : value;

    await db
      .insert(schema.settings)
      .values({
        userId,
        key,
        valueEncrypted,
      })
      .onConflictDoUpdate({
        target: [schema.settings.userId, schema.settings.key],
        set: { valueEncrypted, updatedAt: new Date() },
      });
  },

  /**
   * Retrieve a setting value. Decrypts sensitive keys automatically.
   */
  async get(userId: string, key: SettingsKey): Promise<string | null> {
    const row = await db
      .select()
      .from(schema.settings)
      .where(and(eq(schema.settings.userId, userId), eq(schema.settings.key, key)))
      .limit(1);

    if (!row.length) return null;

    const valueEncrypted = row[0].valueEncrypted;
    if (!valueEncrypted) return null;

    if (SENSITIVE_KEYS.includes(key)) {
      return decrypt(valueEncrypted);
    }

    return valueEncrypted;
  },

  /**
   * Get all settings for a user as a key-value map.
   */
  async getAll(userId: string): Promise<Record<string, string>> {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.userId, userId));

    const result: Record<string, string> = {};
    for (const row of rows) {
      if (!row.valueEncrypted) continue;
      if (SENSITIVE_KEYS.includes(row.key as SettingsKey)) {
        const decrypted = await decrypt(row.valueEncrypted);
        if (decrypted) result[row.key] = decrypted;
      } else {
        result[row.key] = row.valueEncrypted;
      }
    }
    return result;
  },

  /**
   * Delete a setting.
   */
  async delete(userId: string, key: SettingsKey): Promise<void> {
    await db
      .delete(schema.settings)
      .where(and(eq(schema.settings.userId, userId), eq(schema.settings.key, key)));
  },
};
