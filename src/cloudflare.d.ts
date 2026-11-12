// What this app uses from the Workers runtime. The types `wrangler types`
// generates are not loaded: they retype fetch and Response for the whole
// project (Response.json() becomes `unknown`), which breaks browser code.
declare module "cloudflare:workers" {
  export const env: {
    /** Neon through Hyperdrive; see wrangler.jsonc. */
    HYPERDRIVE: { connectionString: string };
  };
  /** Keeps the Worker alive until the promise settles, after the response. */
  export function waitUntil(promise: Promise<unknown>): void;
}
