import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().default("postgres://seoai:seoai@localhost:5432/seo_ai"),

  // Redis (BullMQ)
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32).default("change-me-to-a-random-64-char-string"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  // Encryption key for settings (32 bytes, hex-encoded = 64 hex chars)
  ENCRYPTION_KEY: z
    .string()
    .length(64)
    .default("0000000000000000000000000000000000000000000000000000000000000000"),

  // AI: DeepSeek (OpenAI-compatible)
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().default("deepseek-v4-flash"),

  // SERP
  SERPER_API_KEY: z.string().optional(),

  // PageSpeed Insights
  PSI_API_KEY: z.string().optional(),

  // Proxy
  PROXY_URL: z.string().url().optional(),

  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  WORKER_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return result.data;
}

export const env = parseEnv();
