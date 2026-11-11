import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, Suspense } from "react";
import { dbProofQuery, runtimeProofQuery } from "@/server/proof.functions";

// Temporary home of the workers.dev build: it shows that the parts of the
// site that depend on the server runtime work on Cloudflare. The real home
// page replaces it when the public pages are ported.
export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    // Not awaited: the page is sent at once and the database rows stream in.
    context.queryClient.prefetchQuery(dbProofQuery);
    return context.queryClient.ensureQueryData(runtimeProofQuery);
  },
  component: StatusPage,
});

function StatusPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <h1 className="font-bold text-3xl text-foreground">
        Ormani po meri · TanStack Start
      </h1>
      <RuntimeChecks />
      <Suspense fallback={<Card title="Baza">Učitavanje…</Card>}>
        <DbChecks />
      </Suspense>
    </main>
  );
}

function RuntimeChecks() {
  const { data } = useSuspenseQuery(runtimeProofQuery);
  return (
    <Card title="Server">
      <Row label="Okruženje" value={data.runtime} />
      <Row
        label="IPS QR kod (PNG)"
        value={`${data.qr.bytes} B`}
        ok={data.qr.isPng}
      />
      <Row
        label="Mejl sa fakturom"
        value={`${data.email.htmlLength} znakova`}
        ok={data.email.htmlLength > 1000}
      />
      <Row
        label="Datum (sr-RS)"
        value={data.intl.date}
        ok={data.intl.date.startsWith("11. 11. 2026")}
      />
      <Row
        label="Cena (sr-RS)"
        value={data.intl.price}
        ok={data.intl.price === "51.355"}
      />
      <Row
        label="node:crypto"
        value={data.crypto.sha256}
        ok={data.crypto.timingSafeEqual}
      />
    </Card>
  );
}

function DbChecks() {
  const { data } = useSuspenseQuery(dbProofQuery);
  if (!data.configured) {
    return (
      <Card title="Baza">
        <Row label="Veza" value="nije podešena" ok={false} />
      </Card>
    );
  }
  return (
    <Card title="Baza">
      <Row label="Materijali" value={String(data.materials)} ok />
      <Row label="Ručke" value={String(data.handles)} ok />
      <Row label="Pravila" value={String(data.rules)} ok />
      <Row label="3 upita paralelno" value={`${data.parallelMs} ms`} ok />
      <Row
        label="Better Auth"
        value={data.authReads ? "čita" : "ne čita"}
        ok={data.authReads}
      />
      <Row
        label="Transakcija (rollback)"
        value={data.rolledBack ? "vraćena" : "nije vraćena"}
        ok={data.rolledBack}
      />
    </Card>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 font-semibold text-foreground text-lg">{title}</h2>
      <dl className="space-y-2 text-sm">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">
        {value}
        {ok !== undefined && (
          <span className={ok ? "ml-2 text-chart-3" : "ml-2 text-destructive"}>
            {ok ? "✓" : "✗"}
          </span>
        )}
      </dd>
    </div>
  );
}
