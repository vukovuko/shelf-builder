"""Compare pages of the new app with the live site: status, head tags, JSON-LD,
headings, links and visible text. Usage: parity.py <new-origin> <path>..."""
import difflib
import html as htmllib
import json
import re
import sys
import urllib.request

LIVE = "https://ormanipomeri.com"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "parity-check"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def attrs(tag):
    return {k.lower(): htmllib.unescape(v) for k, v in re.findall(r'([\w:-]+)="([^"]*)"', tag)}


def extract(page):
    out = {}
    m = re.search(r"<title[^>]*>(.*?)</title>", page, re.S)
    out["title"] = htmllib.unescape(m.group(1)).strip() if m else None
    meta = {}
    for tag in re.findall(r"<meta\b[^>]*>", page):
        a = attrs(tag)
        key = a.get("name") or a.get("property")
        if key and "content" in a:
            meta.setdefault(key, [])
            if a["content"] not in meta[key]:
                meta[key].append(a["content"])
    out["meta"] = meta
    canon = [attrs(t).get("href") for t in re.findall(r"<link\b[^>]*>", page) if attrs(t).get("rel") == "canonical"]
    out["canonical"] = canon[0] if canon else None
    lds = []
    for body in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', page, re.S):
        try:
            lds.append(json.loads(body))
        except Exception:
            lds.append({"unparsable": body[:80]})
    out["jsonld"] = sorted((json.dumps(x, sort_keys=True, ensure_ascii=False) for x in lds))
    body = re.sub(r"<(script|style|noscript|template)\b.*?</\1>", " ", page, flags=re.S)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    out["h"] = [re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", h))).strip()
                for h in re.findall(r"<h[12][^>]*>(.*?)</h[12]>", body, re.S)]
    out["links"] = sorted({attrs(t).get("href") for t in re.findall(r"<a\b[^>]*>", body) if attrs(t).get("href")})
    out["imgs"] = len(re.findall(r"<img\b", body))
    main = re.search(r"<body[^>]*>(.*)</body>", body, re.S)
    text = re.sub(r"<[^>]+>", " ", main.group(1) if main else body)
    out["text"] = re.sub(r"\s+", " ", htmllib.unescape(text)).strip()
    return out


IGNORED_META = {"viewport", "next-size-adjust"}


def compare(path, new_origin):
    ls, lp = fetch(LIVE + path)
    ns, np_ = fetch(new_origin + path)
    problems = []
    if ls != ns:
        problems.append(f"status live={ls} new={ns}")
    if not (lp.lstrip().startswith("<!DOCTYPE html") or "<html" in lp[:300]):
        if lp != np_:
            a, b = lp.splitlines(), np_.splitlines()
            diff = [d for d in difflib.unified_diff(a, b, lineterm="", n=0) if not d.startswith(("---", "+++", "@@"))]
            problems.append(f"body differs ({len(diff)} lines): " + " | ".join(diff[:6]))
        return ls, ns, problems
    l, n = extract(lp), extract(np_)
    if l["title"] != n["title"]:
        problems.append(f"title live={l['title']!r} new={n['title']!r}")
    if l["canonical"] != n["canonical"]:
        problems.append(f"canonical live={l['canonical']} new={n['canonical']}")
    for key in sorted(set(l["meta"]) | set(n["meta"])):
        if key in IGNORED_META:
            continue
        if l["meta"].get(key) != n["meta"].get(key):
            problems.append(f"meta {key}: live={l['meta'].get(key)} new={n['meta'].get(key)}")
    if l["jsonld"] != n["jsonld"]:
        only_l = [x[:160] for x in l["jsonld"] if x not in n["jsonld"]]
        only_n = [x[:160] for x in n["jsonld"] if x not in l["jsonld"]]
        problems.append(f"json-ld differs: live-only={only_l} new-only={only_n}")
    if l["h"] != n["h"]:
        problems.append(f"headings differ: live={l['h'][:6]} new={n['h'][:6]}")
    if l["links"] != n["links"]:
        problems.append(f"links: live-only={sorted(set(l['links'])-set(n['links']))[:8]} new-only={sorted(set(n['links'])-set(l['links']))[:8]}")
    if l["imgs"] != n["imgs"]:
        problems.append(f"img count live={l['imgs']} new={n['imgs']}")
    if l["text"] != n["text"]:
        ratio = difflib.SequenceMatcher(None, l["text"], n["text"], autojunk=False).quick_ratio()
        sm = difflib.SequenceMatcher(None, l["text"][:20000], n["text"][:20000], autojunk=False)
        first = next((op for op in sm.get_opcodes() if op[0] != "equal"), None)
        where = ""
        if first:
            _, i1, i2, j1, j2 = first
            where = f" first diff: live={l['text'][max(0,i1-30):i2+30]!r} new={n['text'][max(0,j1-30):j2+30]!r}"
        problems.append(f"text differs (similarity {ratio:.4f}, len live={len(l['text'])} new={len(n['text'])}){where}")
    return ls, ns, problems


if __name__ == "__main__":
    origin = sys.argv[1]
    bad = 0
    for path in sys.argv[2:]:
        ls, ns, problems = compare(path, origin)
        print(("OK  " if not problems else "DIFF") + f" {path}  ({ls}/{ns})")
        for p in problems:
            bad += 1
            print("     - " + p[:900])
    print(f"\n{bad} difference(s)")
