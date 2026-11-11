import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { runDbProof, runRuntimeProof } from "./proof.server";

const getRuntimeProof = createServerFn({ method: "GET" }).handler(() =>
  runRuntimeProof(),
);

const getDbProof = createServerFn({ method: "GET" }).handler(() =>
  runDbProof(),
);

export const runtimeProofQuery = queryOptions({
  queryKey: ["dev", "runtime-proof"],
  queryFn: () => getRuntimeProof(),
});

export const dbProofQuery = queryOptions({
  queryKey: ["dev", "db-proof"],
  queryFn: () => getDbProof(),
});
