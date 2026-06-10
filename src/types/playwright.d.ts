// Type declaration for Playwright (optional dependency — only available in Docker worker)
declare module "playwright" {
  export const chromium: {
    launch(opts?: Record<string, unknown>): Promise<{
      newContext(opts?: Record<string, unknown>): Promise<{
        newPage(): Promise<{
          goto(url: string, opts?: Record<string, unknown>): Promise<unknown>;
          waitForSelector(selector: string, opts?: Record<string, unknown>): Promise<unknown>;
          waitForTimeout(ms: number): Promise<void>;
          $$(selector: string): Promise<Array<{
            textContent(): Promise<string | null>;
            evaluateHandle(fn: (el: Element) => unknown): Promise<{
              evaluate(fn: (el: Element, ...args: unknown[]) => unknown): Promise<unknown>;
            }>;
          }>>;
          evaluate(fn: (...args: unknown[]) => unknown): Promise<unknown>;
          close(): Promise<void>;
        }>;
        close(): Promise<void>;
      }>;
      close(): Promise<void>;
    }>;
  };
}
