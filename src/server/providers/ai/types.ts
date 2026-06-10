/**
 * AIProvider adapter interface.
 *
 * Currently only DeepSeek is implemented, but this interface allows
 * swapping in OpenAI, Anthropic, or local models in the future.
 */

import type { z } from "zod";

export interface AIProvider {
  name: string;

  /**
   * Generate structured JSON output using the model's function-calling / JSON mode.
   * Returns a validated object matching the provided Zod schema.
   */
  generateJSON<T>(opts: {
    system: string;
    user: string;
    schema: z.ZodType<T>;
  }): Promise<T>;

  /**
   * Generate free-form markdown (for audit plans, comparison reports, etc.).
   */
  generateMarkdown(opts: {
    system: string;
    user: string;
  }): Promise<string>;
}
