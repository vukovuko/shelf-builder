import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  DESIGN_IMPORT_ADMIN_ONLY,
  MAX_DESCRIPTION_CHARS,
} from "@/lib/design-import/config";
import {
  checkUploadedImage,
  type UploadMediaType,
} from "@/lib/design-import/image";
import { readWardrobe } from "@/lib/design-import/read-wardrobe";
import { getPostHogServer } from "@/lib/posthog-server";
import { isCurrentUserAdmin } from "@/lib/roles";
import {
  addDesignImportJunk,
  checkRateLimit,
  designImportBurstLimit,
  designImportIpLimit,
  designImportJunkCount,
  designImportRateLimit,
  getIdentifier,
  guardPaidRoute,
  recallDesignImport,
  rememberDesignImport,
} from "@/lib/upstash-rate-limit";

// Claude usually answers in 3–10 s; leave room for one retry.
export const maxDuration = 60;

// Across all users: at ~$0.02 per image this bounds the worst day at ~$2.
const DAILY_BUDGET = 100;
// "No wardrobe here" results per account per day before requests pause.
const JUNK_LIMIT = 3;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Prijavite se" }, { status: 401 });
  }
  const allowed = DESIGN_IMPORT_ADMIN_ONLY
    ? await isCurrentUserAdmin()
    : session.user.emailVerified;
  if (!allowed) {
    return NextResponse.json({ error: "Nije dostupno" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length > MAX_DESCRIPTION_CHARS) {
    return NextResponse.json(
      { error: `Opis može imati najviše ${MAX_DESCRIPTION_CHARS} znakova` },
      { status: 400 },
    );
  }
  let image: { data: string; mediaType: UploadMediaType } | undefined;
  if (body?.data != null) {
    const checked = checkUploadedImage(body.data, body.mediaType);
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }
    image = { data: checked.data, mediaType: checked.mediaType };
  } else if (text.length < 3) {
    return NextResponse.json(
      { error: "Pošaljite sliku ili opišite orman" },
      { status: 400 },
    );
  }
  const failed = image
    ? "Čitanje slike nije uspelo. Pokušajte ponovo."
    : "Pravljenje ormana nije uspelo. Pokušajte ponovo.";

  const userId = session.user.id;
  const hash = createHash("sha256")
    .update(`${image?.data ?? ""}\n${text}`)
    .digest("hex");
  const known = await recallDesignImport(hash);
  if (known) return NextResponse.json({ draft: known });

  if ((await designImportJunkCount(userId)) >= JUNK_LIMIT) {
    return NextResponse.json(
      {
        error:
          "Danas ste više puta poslali nešto u čemu nismo prepoznali orman. Pokušajte ponovo sutra.",
      },
      { status: 429 },
    );
  }
  const burst =
    (await checkRateLimit(designImportBurstLimit, userId)) ??
    (await checkRateLimit(designImportIpLimit, getIdentifier(request)));
  if (burst) return burst;

  const blocked = await guardPaidRoute(
    request,
    designImportRateLimit,
    { name: "design-import", perDay: DAILY_BUDGET },
    userId,
  );
  if (blocked) return blocked;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("design-import: ANTHROPIC_API_KEY is not set");
    return NextResponse.json(
      { error: "Usluga trenutno nije dostupna" },
      { status: 503 },
    );
  }

  const started = Date.now();
  try {
    const reading = await readWardrobe({ image, text: text || undefined });
    const usage = {
      model: reading.model,
      stopReason: reading.stopReason,
      inputTokens: reading.inputTokens,
      outputTokens: reading.outputTokens,
      estimatedCostUsd: Number(reading.estimatedCostUsd.toFixed(4)),
      imageBytes: image ? Math.round((image.data.length * 3) / 4) : 0,
      textChars: text.length,
      durationMs: Date.now() - started,
    };
    console.log("design-import", JSON.stringify({ userId, ...usage }));
    getPostHogServer()?.capture({
      distinctId: userId,
      event: "design_import_api",
      properties: usage,
    });
    // A refusal or cut-off reply isn't the customer's fault; only a clean
    // "no wardrobe" answer counts as junk, and only clean answers are kept.
    if (reading.stopReason === "end_turn") {
      await rememberDesignImport(hash, reading.draft);
      if ((reading.draft as { recognized?: boolean }).recognized === false) {
        await addDesignImportJunk(userId);
      }
    }
    return NextResponse.json({ draft: reading.draft });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Previše zahteva, pokušajte za minut" },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`design-import: Claude API ${error.status}`, error.message);
    } else {
      console.error("design-import failed:", error);
    }
    return NextResponse.json({ error: failed }, { status: 502 });
  }
}
