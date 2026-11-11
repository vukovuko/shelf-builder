import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import { runWithDb } from "@/db/db";

const dbScope = createMiddleware().server(({ next }) =>
  runWithDb(process.env.DATABASE_URL, () => next()),
);

export const startInstance = createStart(() => ({
  requestMiddleware: [
    // Start adds this by itself only when src/start.ts does not exist.
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" }),
    dbScope,
  ],
}));
