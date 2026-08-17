# miguelloza-forwards

Serves **miguelloza.com** — a Vercel static project on the apex domain, with git auto-deploy (push to `main` → Vercel deploys). `.vercel` is gitignored, it is a local link only.

This repo holds **almost nothing**: `index.html`, `vercel.json`, `.gitignore`, and this file. Client sites are **not** copied in here. Each one lives in its own public repo on GitHub Pages and is proxied in by a rewrite in `vercel.json`, so the source repo stays the single source of truth and this repo is touched once per site, ever.

**The apex root stays a placeholder** (`index.html` = "Miguel Loza"). Never put a client site at the root.

## Publishing a site

Run **`/publish <project-name>`** in Claude Code (`~/.claude/commands/publish.md`). It does the whole flow and verifies it end to end, including a pre-push scan for anything sensitive that should not go public. Plain language works too, but the command carries the gotchas so nothing gets missed.

One-time setup per site:

1. The source repo must be **public** — Pages on private repos needs a paid plan, and the GroundworkHQ account has a billing hold that disables pushes account-wide whenever it holds any private repo.
2. Enable Pages:
   `gh api -X POST repos/GroundworkHQ/<slug>/pages -f "source[branch]=main" -f "source[path]=/"`
3. Add the rewrites below to `vercel.json`, commit, push.

```json
{ "source": "/<slug>",         "destination": "https://groundworkhq.github.io/<slug>/index.html" },
{ "source": "/<slug>/",        "destination": "https://groundworkhq.github.io/<slug>/index.html" },
{ "source": "/<slug>/:path*/", "destination": "https://groundworkhq.github.io/<slug>/:path*/index.html" },
{ "source": "/<slug>/:path*",  "destination": "https://groundworkhq.github.io/<slug>/:path*" }
```

**After that, push the source repo only.** Live in about 30 seconds. No file sync, no second commit, and **no `<base href>` needed** — Pages serves a project site under `/<slug>/` and the apex serves it at `/<slug>/`, so relative paths line up natively on both sides.

## Preview subdomains — `<slug>.miguelloza.com`

**Status: convention agreed 2026-08-17, nothing set up yet.** `inner-edge` is intended to be the first, once its Vercel project exists (see that repo's REFERENCE §9).

The proxy flow above can only ever show `main`, because Pages builds one branch. This is the second publishing mode, for **work that is not ready**: a stable public URL per project that tracks an unfinished branch.

**The rule is the same for every project, so there is nothing to remember per site:**

> Push to **`preview`** → live at **`<slug>.miguelloza.com`**.

`main` still means production. `preview` means "show someone, do not ship."

### One-time setup per project

1. **Cloudflare:** `CNAME <slug>` → the value Vercel shows when you add the domain. ⚠️ **DNS-only, grey cloud.** Same rule as the apex records above — proxying Cloudflare in front of Vercel breaks certificate issuance.
2. **Vercel:** add `<slug>.miguelloza.com` to that project with **`gitBranch: "preview"`**. It is a first-class field on `POST /v10/projects/{id}/domains`, not a workaround, and it is patchable later, so the subdomain can be re-pointed at a different branch without touching DNS.
3. **Add the `noindex` header** to that project's `vercel.json`, scoped to the preview host so production is unaffected:

```json
"headers": [
  {
    "source": "/(.*)",
    "has": [{ "type": "host", "value": "<slug>.miguelloza.com" }],
    "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }]
  }
]
```

⚠️ **Step 3 is not optional.** A public preview gets crawled, and then unapproved client work competes in search results with the client's own domain. Retrofitting this after something is indexed is much worse than doing it up front.

### Limits, before relying on it

- **Vercel-hosted projects only.** `rekindle`, `gateway-city-church`, `frontdesk-ai` qualify today; `inner-edge` will once it moves. **`manscaped-outdoors` and `neurowaves` are GitHub Pages only** and would need migrating to Vercel first — until then they stay on the path proxy above. The two modes coexist fine.
- **Public means public.** This is the point (Vercel's own `*.vercel.app` previews are login-gated by default, which is why they are useless for showing a client anything), but it means anyone with the link sees unreleased work. The source repos are public anyway, so this is not a new exposure, but a URL is far more discoverable than a repo.
- **Not a substitute for the client's own domain.** Once a site is live on its real domain, retire its preview subdomain rather than leaving two public copies. Same duplicate-content reasoning as `noindex`.

## Gotchas

Each of these cost a debug cycle.

1. **The proxy never resolves a directory to `index.html` on the destination.** Any path that is a directory must say `index.html` explicitly or it 404s, while flat files beside it proxy fine at 200. Directory rules must come **before** the generic `:path*` file rule. A site of flat `.html` files does not need the directory rule at all.
2. **Delete any copied folder still sitting in this repo.** Vercel serves the filesystem *before* rewrites, so the proxy silently never fires while a real directory exists at that path.
3. **The trailing slash is the form that matters** — relative asset paths only resolve correctly from `/<slug>/`.
4. **A site carrying `<base href="/<slug>/" />` works only because the path segment matches on both hosts.** It breaks the moment it is pointed at a real domain root. Neurowaves is in this state.

## Live sites

All on the proxy flow as of 2026-07-30. No client site lives in this repo.

| URL | Source repo | Notes |
|---|---|---|
| miguelloza.com/manscaped-outdoors/ | `GroundworkHQ/manscaped-outdoors` | Migrated off the old copy-in flow 2026-07-30 |
| miguelloza.com/neurowaves/ | `GroundworkHQ/neurowaves` | Carries `<base href>` + absolute `/neurowaves/...` links, see gotcha 4 |

**Retired: `miguelloza.com/inner-edge/`**, 2026-08-17. That site went live on its own domain, `inneredgescalping.com`, so the proxy was serving a second public copy of a client site — duplicate content on a domain unrelated to their brand. The three rewrites were replaced with **307 redirects to the real domain**, including a `:path*` rule so deep links carry over.

⚠️ **Deliberately `"permanent": false`.** A 308 would be cached hard by every browser that hit it, which permanently surrenders `/inner-edge` on this domain — you could never reuse the path or call those visitors back. A 307 kills the duplicate content just as well and stays reversible. **Retiring a slug is exactly the case where a temporary redirect is right**, because the destination is someone else's domain and the arrangement may not be forever.

**This is the general rule when a site reaches its own domain:** replace its rewrites here with 307s to the real domain. Do not just delete them — an old preview link then 404s in a client's inbox and you never find out. Do not make them permanent either.

## If the whole apex goes down at once

Every slug failing together with `ERR_CONNECTION_CLOSED` on every network is a **registrar** problem, not a deploy problem. This happened 2026-07-22: the domain expired at Namecheap, which yanked the Cloudflare nameservers and pointed it at a parking lander. Renewing restored it automatically.

Diagnose with `dig +short miguelloza.com NS`. If it is not `jule`/`koa.ns.cloudflare.com`, it is registrar or expiry. Correct Cloudflare records: A `@` and `www` → `76.76.21.21` (Vercel), DNS-only.

## Fallback flow (private repos only)

Only when a site has no public source repo: copy the static site into a `<slug>/` subfolder here, add `<base href="/<slug>/" />` right after `<head>` in **every** HTML page or assets 404 on subpages, then commit and push. This is the old flow and it is strictly worse — a sync could silently drop the base tag. Avoid unless there is no alternative.
