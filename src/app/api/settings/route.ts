import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { settingsService, type SettingsKey } from "@/server/services/settingsService";

const VALID_KEYS = new Set<SettingsKey>([
  "deepseek_api_key",
  "serper_api_key",
  "psi_api_key",
  "gsc_service_account_json",
  "rank_provider",
  "proxy_url",
]);

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || !VALID_KEYS.has(key)) {
      return NextResponse.json({ error: `Invalid key: ${key}` }, { status: 400 });
    }

    await settingsService.set(session.user.id, key, value as string);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to save setting:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
