"""Every route the old Next.js app had (from the `next-vercel` branch), requested on a new build.

A route that exists must not answer 404 or 405. Unsafe methods are sent with
an empty JSON body and no session, so handlers refuse them (400/401/403)
without changing anything.
"""
import json, re, subprocess, sys, urllib.request, urllib.error

BASE = sys.argv[1].rstrip("/")
ONLY_SAFE = len(sys.argv) > 2 and sys.argv[2] == "--safe"
REPO = sys.argv[3] if len(sys.argv) > 3 else "."

def git(*args):
    return subprocess.run(["git", "-C", REPO, *args], capture_output=True, text=True, check=True).stdout

files = [f for f in git("ls-tree", "-r", "--name-only", "origin/next-vercel", "src/app").splitlines()]

SAMPLES = {
    "blog/[slug]": "kako-izabrati-orman-po-meri",
    "materijali/[slug]": "aida-orah-a811ps11",
    "rucke/[slug]": "rucka-md",
}

def url_path(file):
    parts = file.removeprefix("src/app/").split("/")[:-1]
    parts = [p for p in parts if not (p.startswith("(") and p.endswith(")"))]
    key = "/".join(parts)
    out = []
    for i, p in enumerate(parts):
        if p.startswith("[[..."):
            continue  # optional catch-all: test the bare path
        if p.startswith("[..."):
            out.append("probe")
        elif p.startswith("["):
            sample = next((v for k, v in SAMPLES.items() if key.endswith(k) and i == len(parts) - 1), None)
            out.append(sample or "00000000-0000-4000-8000-000000000000")
        else:
            out.append(p)
    return "/" + "/".join(out)

METHOD = re.compile(r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b|as\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\b")

routes = []
for f in files:
    name = f.rsplit("/", 1)[-1]
    if name == "page.tsx":
        routes.append(("GET", url_path(f), "page"))
    elif name in ("route.ts", "route.tsx"):
        src = git("show", f"origin/next-vercel:{f}")
        methods = sorted({m for g in METHOD.findall(src) for m in g if m})
        for m in methods:
            routes.append((m, url_path(f), "handler"))
    elif name in ("robots.ts", "sitemap.ts", "manifest.ts"):
        routes.append(("GET", "/" + {"robots.ts": "robots.txt", "sitemap.ts": "sitemap.xml", "manifest.ts": "manifest.webmanifest"}[name], "metadata"))
    elif re.match(r"(icon|apple-icon|opengraph-image|twitter-image|favicon)\.", name):
        routes.append(("GET", url_path(f) .rstrip("/") + "/" + name.split(".")[0] + ("" if name.startswith("favicon") is False else ".ico"), "metadata"))

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None
opener = urllib.request.build_opener(NoRedirect)

def hit(method, path):
    data = None
    headers = {"user-agent": "route-audit", "origin": BASE}
    if method not in ("GET", "OPTIONS"):
        data = b"{}"
        headers["content-type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        with opener.open(req, timeout=40) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:
        return f"ERR {type(e).__name__}"

bad = []
seen = set()
rows = []
for method, path, kind in sorted(set(routes), key=lambda r: (r[1], r[0])):
    if ONLY_SAFE and method != "GET":
        continue
    if (method, path) in seen:
        continue
    seen.add((method, path))
    status = hit(method, path)
    flag = ""
    if status in (404, 405) or (isinstance(status, str)) or (isinstance(status, int) and status >= 500):
        # an unknown id on a page or a detail handler is a legitimate 404
        expected_404 = status == 404 and "00000000-0000-4000-8000-000000000000" in path
        if not expected_404:
            flag = "  <-- CHECK"
            bad.append((method, path, status))
    rows.append(f"{status}  {method:6} {path}  [{kind}]{flag}")
print("\n".join(rows))
print(f"\n{len(rows)} requests, {len(bad)} to check")
for b in bad:
    print("  CHECK:", *b)
