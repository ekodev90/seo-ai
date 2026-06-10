import { env } from "@/lib/env";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Derives a CryptoKey from the hex-encoded ENCRYPTION_KEY env var.
 */
async function getKey(): Promise<CryptoKey> {
  const rawKey = Buffer.from(env.ENCRYPTION_KEY, "hex");
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string. Returns hex-encoded IV:ciphertext.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = Buffer.from(plaintext, "utf-8");

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    encoded
  );

  const ivHex = Buffer.from(iv).toString("hex");
  const ctHex = Buffer.from(ciphertext).toString("hex");

  return `${ivHex}:${ctHex}`;
}

/**
 * Decrypts a hex-encoded IV:ciphertext string back to plaintext.
 * Returns null if decryption fails (wrong key, corrupted data).
 */
export async function decrypt(encrypted: string): Promise<string | null> {
  if (!encrypted || !encrypted.includes(":")) return null;

  const key = await getKey();
  const [ivHex, ctHex] = encrypted.split(":");

  try {
    const iv = Buffer.from(ivHex, "hex");
    const ciphertext = Buffer.from(ctHex, "hex");

    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv: iv as BufferSource },
      key,
      ciphertext
    );
    return Buffer.from(plaintext).toString("utf-8");
  } catch {
    return null;
  }
}
