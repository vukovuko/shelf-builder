import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

type Db = NodePgDatabase<typeof schema>;

interface DbScope {
  connectionString: string | undefined;
  db?: Db;
}

// Workers forbid using a socket opened by one request from another request,
// so there is no shared pool: each request gets its own, opened on the first
// query. Hyperdrive keeps the real connections to Postgres warm behind it.
const scope = new AsyncLocalStorage<DbScope>();

// Workers allow six open connections per request; five leaves one for fetch.
const MAX_CONNECTIONS = 5;

function open(connectionString: string | undefined): Db {
  if (!connectionString) throw new Error("Database is not configured");
  // The pool is never ended by hand: a streamed response or waitUntil work can
  // still be querying after the handler returns, and the runtime closes the
  // sockets when the request is over.
  return drizzle(new Pool({ connectionString, max: MAX_CONNECTIONS }), {
    schema,
  });
}

/** Runs `fn` with its own database connections; see src/start.ts. */
export function runWithDb<T>(
  connectionString: string | undefined,
  fn: () => T,
): T {
  return scope.run({ connectionString }, fn);
}

// Scripts and tests run in Node, where one pool for the process is fine.
let processDb: Db | undefined;

function current(): Db {
  const store = scope.getStore();
  if (store) {
    store.db ??= open(store.connectionString);
    return store.db;
  }
  if (globalThis.navigator?.userAgent === "Cloudflare-Workers") {
    throw new Error("Database used outside a request");
  }
  processDb ??= open(process.env.DATABASE_URL);
  return processDb;
}

/** The current request's database. Importers use it like a plain Drizzle client. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = current();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
