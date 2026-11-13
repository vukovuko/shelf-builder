// What this app uses from the Workers runtime. The types `wrangler types`
// generates are not loaded: they retype fetch and Response for the whole
// project (Response.json() becomes `unknown`), which breaks browser code.
declare module "cloudflare:workers" {
  export const env: {
    /** Neon through Hyperdrive; see wrangler.jsonc. */
    HYPERDRIVE: { connectionString: string };
    /** The public R2 bucket for uploaded images; see src/lib/r2.ts. */
    UPLOADS: {
      put(
        key: string,
        value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
        options?: { httpMetadata?: { contentType?: string } },
      ): Promise<unknown>;
    };
    /** KV for the catalog cache; see src/server/edge-cache.server.ts. */
    CACHE: {
      get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
      get<T>(
        key: string,
        options: { type: "json"; cacheTtl?: number },
      ): Promise<T | null>;
      getWithMetadata<M>(
        key: string,
        options: { type: "stream"; cacheTtl?: number },
      ): Promise<{ value: ReadableStream | null; metadata: M | null }>;
      put(
        key: string,
        value: string | ReadableStream,
        options?: { expirationTtl?: number; metadata?: object },
      ): Promise<void>;
    };
  };
  /** Keeps the Worker alive until the promise settles, after the response. */
  export function waitUntil(promise: Promise<unknown>): void;
}

/** Different for every build; set in vite.config.ts. */
declare const __BUILD_ID__: string;
