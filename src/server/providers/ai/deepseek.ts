/**
 * DeepSeek AI Provider (via OpenAI-compatible API).
 *
 * Uses model deepseek-v4-flash (the current DeepSeek model as of June 2026).
 * Supports JSON output and function calling.
 */

import OpenAI from "openai";
import type { z } from "zod";
import type { AIProvider } from "./types";
import { env } from "@/lib/env";
import { settingsService } from "@/server/services/settingsService";

function createClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: env.DEEPSEEK_BASE_URL,
  });
}

export class DeepSeekProvider implements AIProvider {
  name = "deepseek" as const;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? env.DEEPSEEK_API_KEY ?? "";
  }

  async generateJSON<T>(opts: {
    system: string;
    user: string;
    schema: z.ZodType<T>;
  }): Promise<T> {
    if (!this.apiKey) {
      throw new Error("DeepSeek API key not configured");
    }

    const client = createClient(this.apiKey);

    const response = await client.chat.completions.create({
      model: env.DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from DeepSeek");
    }

    try {
      const parsed = JSON.parse(content);
      return opts.schema.parse(parsed);
    } catch (err) {
      throw new Error(`Failed to parse DeepSeek response: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async generateMarkdown(opts: {
    system: string;
    user: string;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error("DeepSeek API key not configured");
    }

    const client = createClient(this.apiKey);

    const response = await client.chat.completions.create({
      model: env.DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      max_tokens: 8192,
    });

    return response.choices[0]?.message?.content ?? "";
  }
}

/**
 * Create a DeepSeek provider with a user-specific API key from settings.
 */
export async function createDeepSeekProvider(userId: string): Promise<DeepSeekProvider> {
  const apiKey = await settingsService.get(userId, "deepseek_api_key");
  return new DeepSeekProvider(apiKey ?? undefined);
}
