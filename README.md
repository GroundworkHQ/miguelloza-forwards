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

**Run `/preview <project>` in Claude Code.** It carries the whole flow and the gotchas. This section is the reference behind it.

**Proven on `inner-edge` 2026-08-17.** Live at `inner-edge.miguelloza.com`, serving the `preview` branch.

The path proxy above can only ever show `main`, because Pages builds one branch. This is the second publishing mode, for **work that is not ready**: a stable client-facing URL per project that tracks an unfinished branch.

> Push to **`preview`** → live at **`<slug>.miguelloza.com`**.

`main` still means production. `preview` means "show someone, do not ship."

**Why not just send the raw Vercel URL.** `<project>-git-<branch>-groundworkhq-projects.vercel.app` usually works and needs no setup at all. The reason to do this anyway is presentation: a branded URL reads as infrastructure you own rather than a git preview, and it does not leak the team slug or the branch name. For work a client is paying for, that is the point. An earlier version of this section justified the subdomain on previews being login-gated — that was generalised from `rekindle` and is **wrong**, see below.

### Per-project checklist

1. **Project must be on Vercel.** `rekindle`, `gateway-city-church`, `frontdesk-ai`, `inner-edge` qualify. `manscaped-outdoors` and `neurowaves` are Pages-only and would need migrating first, which is real work.
2. **Check deployment protection** — see the warning below. Turn Vercel Authentication off, or the link demands a login.
3. **Create the `preview` branch** if it does not exist, from `main`, then merge the work-in-progress branch in.
4. **Add the `noindex` header** to that project's `vercel.json`, on `main`:
```json
"headers": [
  {
    "source": "/(.*)",
    "has": [{ "type": "host", "value": "<slug>.miguelloza.com" }],
    "headers": [{ "key": "X-Robots-Tag", "value": "noindex, nofollow" }]
  }
]
```
5. **Attach:** `vercel domains add <slug>.miguelloza.com <project> --scope groundworkhq-projects`
6. **Bind to the branch.** No CLI flag for this; PATCH `/v9/projects/<id>/domains/<domain>` with `{"gitBranch":"preview"}`. It is patchable later, so a subdomain can be re-pointed at a different branch **without touching DNS**.
7. **DNS: nothing to do**, the wildcard covers it — verified, see below. Add an explicit record only once the URL has gone to a client.
8. **Verify:** 200 on the subdomain (~3 min for the certificate), preview-only content present there and absent from production, and `x-robots-tag` on the preview but not production.

### DNS: one wildcard, then never again

```
CNAME   *   ->   cname.vercel-dns.com      DNS only (grey cloud)
```

In place since 2026-08-17. One record in Cloudflare covers every current and future slug, so **per-project DNS work is zero** — `/preview` on a new project needs no record at all.

**Tested end to end, not just reasoned.** A throwaway subdomain with no record of its own was claimed on the `inner-edge` project: it got a certificate in about **ten seconds** and served the correct site. Removing it returned it to a plain 404. Specifically confirmed:

| | |
|---|---|
| Wildcard resolves a name with no explicit record | yes |
| Vercel issues a cert for a wildcard-only name | yes, ~10s |
| It routes to whichever project claimed it | yes |
| A name **no** project has claimed | 404, no cert, harmless |
| Explicit record + wildcard together | no conflict |

**Why there is no conflict:** Vercel routes by `Host` header. The DNS wildcard only makes a hostname *resolve*; which project answers is decided by whichever project has claimed that exact hostname. In Cloudflare, a specific record beats the wildcard.

**Pin the client-facing ones, let the wildcard cover the rest.** Add an explicit record for any subdomain you have actually sent to a client; leave everything else to the wildcard. The wildcard is a single point of failure — delete it, mistype it, or flip it to orange cloud and every subdomain dies at once. An explicit record insulates the URL that is sitting in someone's inbox from a mistake on the catch-all. `inner-edge` is pinned for this reason. For a slug you are only looking at yourself, do not bother.

⚠️ **Grey cloud only.** Proxying Cloudflare in front of Vercel breaks certificate issuance. Cloudflare's free plan only supports wildcards DNS-only anyway, so this lines up.

⚠️ **Never switch miguelloza.com's nameservers to Vercel.** Vercel suggests it every time you add a domain. **Cloudflare Email Routing handles mail for this domain** (`route1/2/3.mx.cloudflare.net` plus an SPF include). Moving nameservers kills Miguel's email. Namecheap is only the registrar.

### DNS tooling: `cf-dns.sh`

DNS for this domain lives in **Cloudflare** (Namecheap is only the registrar). There is no Cloudflare MCP, so DNS is scripted rather than clicked:

```
~/.claude/scripts/cf-dns.sh whoami            # verify token + zone access
~/.claude/scripts/cf-dns.sh list [filter]     # list records
~/.claude/scripts/cf-dns.sh add CNAME foo cname.vercel-dns.com
~/.claude/scripts/cf-dns.sh del foo.miguelloza.com
```

Defaults to `miguelloza.com` (override with `CF_ZONE=`), creates records **grey cloud**, TTL auto.

**The token is deliberately narrow.** A Cloudflare user API token with **`Zone:DNS:Edit` on `miguelloza.com` only** — not "All zones". Verified 2026-08-18: pointed at `inneredgescalping.com` it fails with exit code 2. That matters, because the client zone holds the Resend DKIM and the SES bounce MX behind their Gmail send-as, and a scoped token physically cannot reach them.

⚠️ **The token lives in the macOS Keychain, never in a file or an env var.** `.zshrc` was deliberately cleaned of keys and should stay that way. Re-add or rotate with:
```
security add-generic-password -a "$USER" -s cloudflare-dns-miguelloza -w
```
It prompts silently, so the value never enters shell history. The script reads it fresh on every run.

**The account-wide Cloudflare MCP was considered and rejected.** It wraps 2,500-plus endpoints behind `search()`/`execute()` across every zone on the account, including client domains. The scoped token does the one job actually needed here with a blast radius of one zone.

**Note it is rarely needed.** The wildcard means `/preview` requires no DNS work. This is for pinning client-facing records, cleanup, and reading DNS to diagnose things without screenshots.

### Tried and rejected: a project-level wildcard domain

**Do not retry this.** Tested 2026-08-17, does not work, removed the same day.

**The idea was** to attach `*.miguelloza.com` to the `miguelloza-forwards` project and use host-based rewrites (`has: [{type:"host"}]`) so a **GitHub Pages** project could get a branded `<slug>.miguelloza.com` without migrating to Vercel.

**What was confirmed good:** with the project wildcard attached, `inner-edge.miguelloza.com` kept serving its own project correctly throughout. A specific project domain is **not** disturbed by another project claiming a wildcard, so the precedence risk is real but resolved in the sensible direction.

**Why it fails anyway:** the wildcard domain never becomes functional. Vercel reports it "not configured properly" and demands either an `A *.miguelloza.com 76.76.21.21` record or its own nameservers. **Neither is available here.** The DNS wildcard is a `CNAME` to `cname.vercel-dns.com`, which resolves across rotating `76.76.21.x` and `66.33.60.x` addresses and does not satisfy that check, and the nameserver route is permanently off the table because Cloudflare Email Routing handles mail for this domain. No certificate is issued, so unclaimed subdomains serve nothing.

⚠️ **Note the distinction, because it is easy to conflate.** A **DNS** wildcard (`CNAME *`, in Cloudflare) works and is what the `/preview` flow relies on — proven. A **project-level wildcard domain** (`*.miguelloza.com` attached to a Vercel project) is a different mechanism and is the one that fails. The first working says nothing about the second.

**And even if the certificate problem were solved, it would not buy what you want.** GitHub Pages builds one branch, so a Pages site can only ever show `main`. A branded subdomain in front of it is cosmetic over what `miguelloza.com/<slug>/` already does, and still cannot show a client unfinished work. **For real previews on `manscaped-outdoors` or `neurowaves`, migrating them to Vercel is the only honest path.**

### Gotchas that cost time

⚠️ **Deployment protection varies per project, so check, do not assume.** `rekindle` has Vercel Authentication on (`all_except_custom_domains`) and its previews cannot be shared. `inner-edge`, created later, has it **off**. New projects default to off. `gateway-city-church` and `frontdesk-ai` are unverified.

⚠️ **Public means public.** Anyone with the link sees unreleased client work. The source repos are public anyway, so it is not new exposure, but a URL is far more discoverable than a repo. That is what step 4 is for.

⚠️ **The `noindex` step is not optional.** Retrofitting it after something is indexed is much worse than doing it up front.

### Retiring one

When the site goes live on its real domain, remove the subdomain and replace any `miguelloza.com/<slug>/` rewrite with a **307** to the real domain. Not a deletion, and not a 308 — see "Live sites" below for why.

## Gotchas

Each of these cost a debug cycle.

1. **The proxy never resolves a directory to `index.html` on the destination.** Any path that is a directory must say `index.html` explicitly or it 404s, while flat files beside it proxy fine at 200. Directory rules must come **before** the generic `:path*` file rule. A site of flat `.html` files does not need the directory rule at all.
2. **Delete any copied folder still sitting in this repo.** Vercel serves the filesystem *before* rewrites, so the proxy silently never fires while a real directory exists at that path.
3. **The trailing slash is the form that matters** — relative asset paths only resolve correctly from `/<slug>/`.
4. **A site carrying `<base href="/<slug>/" />` works only because the path segment matches on both hosts.** It breaks the moment it is pointed at a real domain root. Neurowaves is in this state.

## Live sites

All on the proxy flow as of 2026-07-30. No client site lives in this repo.

| URL | Source repo | Mode | Notes |
|---|---|---|---|
| miguelloza.com/manscaped-outdoors/ | `GroundworkHQ/manscaped-outdoors` | path proxy | Migrated off the old copy-in flow 2026-07-30 |
| miguelloza.com/neurowaves/ | `GroundworkHQ/neurowaves` | path proxy | Carries `<base href>` + absolute `/neurowaves/...` links, see gotcha 4 |
| inner-edge.miguelloza.com | `GroundworkHQ/inner-edge` | **subdomain**, `preview` branch | Live 2026-08-17. Production is `inneredgescalping.com`; this shows unreleased work only |

**Retired: `miguelloza.com/inner-edge/`**, 2026-08-17. That site went live on its own domain, `inneredgescalping.com`, so the proxy was serving a second public copy of a client site — duplicate content on a domain unrelated to their brand. The three rewrites were replaced with **307 redirects to the real domain**, including a `:path*` rule so deep links carry over.

⚠️ **Deliberately `"permanent": false`.** A 308 would be cached hard by every browser that hit it, which permanently surrenders `/inner-edge` on this domain — you could never reuse the path or call those visitors back. A 307 kills the duplicate content just as well and stays reversible. **Retiring a slug is exactly the case where a temporary redirect is right**, because the destination is someone else's domain and the arrangement may not be forever.

**This is the general rule when a site reaches its own domain:** replace its rewrites here with 307s to the real domain. Do not just delete them — an old preview link then 404s in a client's inbox and you never find out. Do not make them permanent either.

## If the whole apex goes down at once

Every slug failing together with `ERR_CONNECTION_CLOSED` on every network is a **registrar** problem, not a deploy problem. This happened 2026-07-22: the domain expired at Namecheap, which yanked the Cloudflare nameservers and pointed it at a parking lander. Renewing restored it automatically.

Diagnose with `dig +short miguelloza.com NS`. If it is not `jule`/`koa.ns.cloudflare.com`, it is registrar or expiry. Correct Cloudflare records: A `@` and `www` → `76.76.21.21` (Vercel), DNS-only.

## Fallback flow (private repos only)

Only when a site has no public source repo: copy the static site into a `<slug>/` subfolder here, add `<base href="/<slug>/" />` right after `<head>` in **every** HTML page or assets 404 on subpages, then commit and push. This is the old flow and it is strictly worse — a sync could silently drop the base tag. Avoid unless there is no alternative.
