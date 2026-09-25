/**
 * Tells Bing (and through it ChatGPT search and Copilot), Yandex, Seznam and
 * Naver that every page in the live sitemap is new or changed, instead of
 * waiting for their next crawl. Run after publishing a blog post or changing
 * page content:  npm run seo:indexnow
 *
 * The key is public by design: search engines check it against
 * public/<key>.txt to confirm the ping comes from the site's owner.
 */
const SITE = "https://ormanipomeri.com";
const KEY = "5599473bc48617af667857b645101f86";

async function main() {
  const sitemap = await fetch(`${SITE}/sitemap.xml`).then((r) => r.text());
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => m[1],
  );
  if (urlList.length === 0) throw new Error("No URLs found in the sitemap");

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key: KEY,
      keyLocation: `${SITE}/${KEY}.txt`,
      urlList,
    }),
  });
  // 200 = accepted, 202 = accepted while the key file is still being checked.
  console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`);
  if (res.status >= 300) console.log(await res.text());
}

main();
