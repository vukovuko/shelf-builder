import { NextResponse } from "next/server";
import {
  autocompleteRateLimit,
  guardPaidRoute,
} from "@/lib/upstash-rate-limit";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// 300/day keeps even a fully abused month (9,000) inside Google's 10,000
// free autocomplete calls; real checkouts use a few dozen a day at most.
const DAILY_BUDGET = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("q")?.trim() ?? "";

  // Same minimum as the client, so short or junk queries never reach Google
  if (input.length < 3 || input.length > 100) {
    return NextResponse.json({ suggestions: [] });
  }

  const blocked = await guardPaidRoute(request, autocompleteRateLimit, {
    name: "places-autocomplete",
    perDay: DAILY_BUDGET,
  });
  if (blocked) return blocked;

  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        },
        body: JSON.stringify({
          input,
          includedRegionCodes: ["rs"],
          languageCode: "sr",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Google Places API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch suggestions" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Transform to simpler format
    const suggestions =
      data.suggestions?.map(
        (s: {
          placePrediction?: {
            placeId: string;
            text: { text: string };
            structuredFormat?: {
              mainText: { text: string };
              secondaryText?: { text: string };
            };
          };
        }) => ({
          placeId: s.placePrediction?.placeId,
          description: s.placePrediction?.text?.text,
          mainText: s.placePrediction?.structuredFormat?.mainText?.text,
          secondaryText:
            s.placePrediction?.structuredFormat?.secondaryText?.text,
        }),
      ) || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
