import { NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface NominatimResult {
  postalCode: string | null;
  municipality: string | null;
}

// Fetch postal code and municipality from Nominatim (OpenStreetMap)
async function fetchFromNominatim(address: string): Promise<NominatimResult> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "rs");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ShelfBuilder/1.0 (address autocomplete)",
        "Accept-Language": "sr-Latn",
      },
    });

    if (!response.ok) return { postalCode: null, municipality: null };

    const data = await response.json();
    if (data.length > 0 && data[0].address) {
      const addr = data[0].address;

      // Extract municipality from suburb field: "Beograd (Novi Beograd)" -> "Novi Beograd"
      let municipality: string | null = null;
      if (addr.suburb) {
        const match = addr.suburb.match(/\(([^)]+)\)/);
        if (match) {
          municipality = match[1];
        } else {
          // Fallback: use suburb directly if no parentheses format
          municipality = addr.suburb;
        }
      }

      return {
        postalCode: addr.postcode || null,
        municipality,
      };
    }
    return { postalCode: null, municipality: null };
  } catch {
    return { postalCode: null, municipality: null };
  }
}

export async function GET(request: Request) {
  if (!GOOGLE_PLACES_API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": "addressComponents,formattedAddress",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Google Places API error:", error);
      return NextResponse.json(
        { error: "Failed to fetch place details" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Extract address components
    let street = "";
    let streetNumber = "";
    let city = "";
    let postalCode = "";

    for (const component of data.addressComponents || []) {
      const types = component.types || [];

      if (types.includes("route")) {
        street = component.longText || component.shortText || "";
      }
      if (types.includes("street_number")) {
        streetNumber = component.longText || component.shortText || "";
      }
      // Priority: locality > sublocality > administrative_area_level_2 > administrative_area_level_1
      if (types.includes("locality")) {
        city = component.longText || component.shortText || "";
      }
      if (!city && types.includes("sublocality")) {
        city = component.longText || component.shortText || "";
      }
      if (!city && types.includes("administrative_area_level_2")) {
        city = component.longText || component.shortText || "";
      }
      if (!city && types.includes("administrative_area_level_1")) {
        city = component.longText || component.shortText || "";
      }
      if (types.includes("postal_code")) {
        postalCode = component.longText || component.shortText || "";
      }
    }

    // Combine street and number
    const fullStreet = streetNumber ? `${street} ${streetNumber}` : street;

    // Fetch additional data from Nominatim (postal code + municipality)
    let municipality = "";
    if (data.formattedAddress) {
      const nominatim = await fetchFromNominatim(data.formattedAddress);
      if (!postalCode && nominatim.postalCode) {
        postalCode = nominatim.postalCode;
      }
      if (nominatim.municipality) {
        municipality = nominatim.municipality;
      }
    }

    return NextResponse.json({
      street: fullStreet,
      city,
      municipality,
      postalCode,
      formattedAddress: data.formattedAddress || "",
    });
  } catch (error) {
    console.error("Places details error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
