import { createHash, timingSafeEqual } from "node:crypto";
import { render } from "@react-email/components";
import { count } from "drizzle-orm";
import { db } from "@/db/db";
import { handles, materials, rules } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isTestBuild } from "@/lib/email-rate-limiter";
import InvoiceEmail from "@/lib/emails/invoice-email";
import { generateIpsQrBuffer } from "@/lib/ips-qr";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

/** Checks the pieces of the checkout that depend on the server runtime. */
export async function runRuntimeProof() {
  const qr = await generateIpsQrBuffer({
    receiverName: "Ormani po meri",
    receiverAccount: "160000000000000000",
    amount: 51355,
    paymentCode: "289",
    paymentPurpose: "Porudzbina 1000",
    referenceNumber: "001000",
  });
  const html = await render(
    InvoiceEmail({
      orderNumber: 1000,
      customerName: "Test Kupac",
      totalPrice: 51355,
      qrCid: "ips-qr",
      receiverName: "Ormani po meri",
      receiverAccountFormatted: "160-0000000000000-00",
      paymentCode: "289",
      paymentPurpose: "Porudzbina 1000",
      referenceNumber: "001000",
    }),
  );
  const a = Buffer.from("ormani");
  return {
    runtime: globalThis.navigator?.userAgent ?? "unknown",
    qr: {
      bytes: qr.length,
      isPng: PNG_SIGNATURE.every((byte, i) => qr[i] === byte),
    },
    email: { htmlLength: html.length },
    // Where this build's email goes; see isTestBuild.
    mail: !isTestBuild()
      ? ("everyone" as const)
      : process.env.EMAIL_REDIRECT_TO
        ? ("one-address" as const)
        : ("nobody" as const),
    intl: {
      date: new Date(Date.UTC(2026, 10, 11, 12)).toLocaleDateString("sr-RS"),
      price: new Intl.NumberFormat("sr-RS").format(51355),
    },
    crypto: {
      sha256: createHash("sha256").update("ormani").digest("hex").slice(0, 12),
      timingSafeEqual: timingSafeEqual(a, Buffer.from("ormani")),
    },
  };
}

class Rollback extends Error {}

/** Reads only: three parallel counts and a transaction that is rolled back. */
export async function runDbProof() {
  const started = Date.now();
  const [[m], [h], [r]] = await Promise.all([
    db.select({ n: count() }).from(materials),
    db.select({ n: count() }).from(handles),
    db.select({ n: count() }).from(rules),
  ]);
  const parallelMs = Date.now() - started;

  let rolledBack = false;
  try {
    await db.transaction(async (tx) => {
      await tx.select({ n: count() }).from(materials);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
    rolledBack = true;
  }

  // Better Auth is built once per isolate; its adapter reaches the database
  // through the per-request client like every other importer of `db`.
  const authContext = await auth.$context;
  const users = await authContext.adapter.count({ model: "user" });

  return {
    authReads: users > 0,
    materials: m.n,
    handles: h.n,
    rules: r.n,
    parallelMs,
    rolledBack,
  };
}
