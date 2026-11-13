import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { INDEXABLE } from "@/lib/seo/site";
import { runDbProof, runRuntimeProof } from "./proof.server";

// The page that shows these is missing on the production site, but a server
// function can be called without its page, so each one refuses there itself.
function onTestBuildsOnly() {
  if (INDEXABLE) throw notFound();
}

const getRuntimeProof = createServerFn({ method: "GET" }).handler(() => {
  onTestBuildsOnly();
  return runRuntimeProof();
});

const getDbProof = createServerFn({ method: "GET" }).handler(() => {
  onTestBuildsOnly();
  return runDbProof();
});

export const runtimeProofQuery = queryOptions({
  queryKey: ["dev", "runtime-proof"],
  queryFn: () => getRuntimeProof(),
});

export const dbProofQuery = queryOptions({
  queryKey: ["dev", "db-proof"],
  queryFn: () => getDbProof(),
});
