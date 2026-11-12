import { env } from "cloudflare:workers";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import { runWithDb } from "@/db/db";

const dbScope = createMiddleware().server(({ next }) =>
  runWithDb(env.HYPERDRIVE.connectionString, () => next()),
);

// What a server function throws travels to the browser, message included,
// and a failed query's message is its SQL. Only redirects and not-found
// answers are meant for the caller; anything else is logged here and replaced.
const hideServerErrors = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (isRedirect(error) || isNotFound(error)) throw error;
      console.error(error);
      throw new Error("Server error");
    }
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [hideServerErrors],
  requestMiddleware: [
    // Start adds this by itself only when src/start.ts does not exist.
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" }),
    dbScope,
  ],
}));
