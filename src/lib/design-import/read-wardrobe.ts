import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { UploadMediaType } from "./image";
import { draftOutputSchema, SYSTEM_PROMPT } from "./prompt";

// Picked by running the test sketches through each model: as accurate as
// Opus 5 and Fable 5.1, faster and steadier, and cheaper than Opus 5.
// Haiku 4.5 misread the basic 2×2 sketch; Sonnet 5 is the budget option.
const MODEL = "claude-opus-5-5";
// Claude Opus 5.5 list price per million tokens, for the usage log only.
const INPUT_USD_PER_MTOK = 4;
const OUTPUT_USD_PER_MTOK = 20;

export interface ImageReading {
  /** Draft for importWardrobeDraft; { recognized: false } when unreadable. */
  draft: unknown;
  model: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

let client: Anthropic | null = null;

/**
 * Asks Claude to describe a wardrobe as a draft, from a photo or sketch, from
 * the customer's written description, or from both (the text then adds what
 * the drawing leaves out, such as measurements).
 */
export async function readWardrobe(input: {
  image?: { data: string; mediaType: UploadMediaType };
  text?: string;
}): Promise<ImageReading> {
  const { image, text } = input;
  // Created lazily so a missing key surfaces as a handled error, not at import.
  client ??= new Anthropic({ timeout: 50_000, maxRetries: 1 });

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: betaZodOutputFormat(draftOutputSchema),
    },
    // A safety-classifier refusal is retried on another model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...(image
            ? [
                {
                  type: "image" as const,
                  source: {
                    type: "base64" as const,
                    media_type: image.mediaType,
                    data: image.data,
                  },
                },
              ]
            : []),
          {
            type: "text",
            text: text
              ? `The customer's description:\n<description>\n${text}\n</description>\nDescribe this wardrobe for the configurator.`
              : "Describe this wardrobe for the configurator.",
          },
        ],
      },
    ],
  });

  const usable =
    response.stop_reason !== "refusal" &&
    response.stop_reason !== "max_tokens" &&
    response.parsed_output != null;
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;

  return {
    draft: usable ? response.parsed_output : { recognized: false },
    model: response.model,
    stopReason: response.stop_reason,
    inputTokens,
    outputTokens,
    estimatedCostUsd:
      (inputTokens * INPUT_USD_PER_MTOK + outputTokens * OUTPUT_USD_PER_MTOK) /
      1_000_000,
  };
}
