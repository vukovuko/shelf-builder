import { env, waitUntil } from "cloudflare:workers";

// The catalog (materials, handles and their prices) changes a few times a
// month, from the admin. Until it does, its data and its finished pages are
// kept in KV and served without the database or a server render.
//
// Every key carries the catalog version. Changing the version (an admin save,
// `npm run catalog:refresh`) makes all of them unreachable at once; they then
// expire by themselves. The version is read with a 30 s edge cache, so a
// price change reaches every visitor within half a minute.
//
// A change made straight in the database, by a script, is not seen. Entries
// live one day, which bounds how stale that can get.

const VERSION_KEY = "catalog-version";
const ONE_DAY = 86_400;
// Entries never change under their key, so an edge location may hold on to
// one it has read for as long as the entry lives.
const HOLD = { cacheTtl: 3_600 };

/** null when KV cannot be read: callers then work uncached. */
async function catalogVersion(): Promise<string | null> {
  try {
    return (await env.CACHE.get(VERSION_KEY, { cacheTtl: 30 })) ?? "0";
  } catch (error) {
    console.error("edge cache: version unreadable", error);
    return null;
  }
}

/** Call after anything that changes what the catalog pages show. */
export async function bumpCatalogVersion(): Promise<void> {
  try {
    await env.CACHE.put(VERSION_KEY, Date.now().toString(36));
  } catch (error) {
    console.error("edge cache: version not updated", error);
  }
}

// A deploy can change the shape of the data and the files a page links to,
// so entries are also per build.
const keyFor = (version: string, kind: string, name: string) =>
  `${kind}:${__BUILD_ID__}:${version}:${name}`;

function store(key: string, value: string | ReadableStream, metadata?: object) {
  waitUntil(
    env.CACHE.put(key, value, { expirationTtl: ONE_DAY, metadata }).catch(
      // Over the day's write quota, or KV is down: the next visit renders again.
      (error: unknown) => console.error("edge cache: not stored", key, error),
    ),
  );
}

/** A catalog list that is the same for every visitor, as JSON-safe data. */
export async function cachedCatalogData<T>(
  name: string,
  load: () => Promise<T>,
): Promise<T> {
  const version = await catalogVersion();
  if (version === null) return load();
  const key = keyFor(version, "data", name);
  try {
    const hit = await env.CACHE.get<T>(key, { type: "json", ...HOLD });
    if (hit !== null) return hit;
  } catch (error) {
    console.error("edge cache: unreadable", key, error);
  }
  const fresh = await load();
  store(key, JSON.stringify(fresh));
  return fresh;
}

interface PageMeta {
  contentType: string;
}

/** The stored page for this request, or how to store the one about to be made. */
export async function pageCache(request: Request) {
  const version = await catalogVersion();
  if (version === null) return null;
  const url = new URL(request.url);
  const key = keyFor(version, "page", url.host + url.pathname);

  let hit: Response | null = null;
  try {
    const { value, metadata } = await env.CACHE.getWithMetadata<PageMeta>(key, {
      type: "stream",
      ...HOLD,
    });
    if (value && metadata) {
      hit = new Response(value.pipeThrough(new DecompressionStream("gzip")), {
        headers: {
          "content-type": metadata.contentType,
          "x-edge-cache": "hit",
        },
      });
    }
  } catch (error) {
    console.error("edge cache: unreadable", key, error);
  }

  return {
    hit,
    /** Returns the response to send; a good one is also stored. */
    keep(response: Response): Response {
      const contentType = response.headers.get("content-type");
      if (
        response.status !== 200 ||
        !response.body ||
        !contentType ||
        response.headers.has("set-cookie")
      ) {
        return response;
      }
      const [toVisitor, toStore] = response.body.tee();
      store(key, toStore.pipeThrough(new CompressionStream("gzip")), {
        contentType,
      } satisfies PageMeta);
      const sent = new Response(toVisitor, response);
      sent.headers.set("x-edge-cache", "miss");
      return sent;
    },
  };
}
