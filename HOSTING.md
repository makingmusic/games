# Hosting & Publishing Guide (all games)

This repo holds small static games. Each game is a self-contained folder
(`99nights/`, future games the same) with an `index.html` entry point, no
build step, and no server. That means every game can be published the same
way through three channels:

1. **GitHub Pages** — free public link, good for playtesting.
2. **Cloudflare Pages** — free public link on a global CDN, good as the
   permanent home + custom domain.
3. **App stores (iOS / Android)** — native wrapper around the same folder.

Recommended rollout per game: GitHub Pages first (share + test), then
Cloudflare Pages as the canonical URL, then app stores once the game has
touch controls and saving.

Below, `<game>` means the game folder, e.g. `99nights`.

## 0. Per-game readiness checklist

A game is ready to publish when:

- [ ] It runs by serving its folder over HTTP, not just `file://`.
  Test locally with `python3 -m http.server` from the repo root, then open
  `http://localhost:8000/<game>/`.
- [ ] All asset/script paths are relative (no absolute `/...` paths, no
  localhost URLs), so the game works under any domain or sub-path.
- [ ] Mobile-ready (required for app stores, nice for web): touch controls,
  responsive viewport, no page scroll/zoom during play, audio unlocks on
  first touch.
- [ ] Progress can be saved (localStorage) — expected by store players.
- [ ] No third-party trackers/ads, especially for kids games (keeps Apple
  Kids-category review and privacy labels trivial).

## 1. GitHub Pages (free, fastest)

Best for: instant shareable link for testers.

- Repo must be public (private repos need a paid plan for Pages).
- Option A — branch deploy: Settings → Pages → Deploy from branch →
  branch `main`, folder `/ (root)`. The game is then live at
  `https://<user>.github.io/<repo>/<game>/`.
- Option B — GitHub Actions deploy (more control, same result).
- HTTPS and a `<user>.github.io` domain are included. Custom domains are
  supported via a `CNAME` file + DNS record.
- Soft limits (~1 GB site, ~100 GB bandwidth/month) — plenty for these
  games. No preview URLs per pull request on the free flow.

Deploy flow per release: merge to `main` → live in ~1 minute.

## 2. Cloudflare Pages (free, permanent home)

Best for: the canonical public URL, custom domain, unlimited bandwidth.

Why it fits: our games are pure static files, and Pages serves static
assets with unlimited bandwidth on the free plan, plus free SSL, preview
deployments, and up to 100 projects per account — one project per game.

Setup (one Pages project per game):

1. Dashboard → Workers & Pages → Create application → Pages.
2. Either connect the GitHub repo (**Git integration**, auto-deploys on
   push — recommended) or use **Direct Upload** (drag-and-drop /
   `wrangler pages deploy` — note: a Direct Upload project cannot be
   converted to Git integration later, so prefer Git integration).
3. For Git integration in this monorepo: set the project's **Root
   directory** to `<game>` (e.g. `99nights`), build command empty, output
   directory `/`. Each game gets `https://<project>.pages.dev`.
4. CLI equivalent for manual deploys:
   `wrangler pages deploy <game> --project-name=<project>`
   after `wrangler login`.
5. Custom domain: Pages → Custom domains → add `play.<domain>` (or the
   apex). Free SSL certificate is automatic.

Free-tier limits that matter here: 20,000 files per site, 25 MiB per file,
500 Cloudflare-built builds/month (direct uploads don't count). Our games
are a dozen small files — nowhere near any limit.

Suggested URL scheme for all games:

- `https://<game>.pages.dev` (automatic), then
- `https://play.<yourdomain>/<game>/` or one domain per game.

## 3. App stores — iOS App Store + Google Play

Best for: iPad/iPhone/Android players; required for real mobile reach.

Approach: **Capacitor** wraps the existing game folder into a native app
with a fullscreen WebView. No rewrite — the web build stays the source of
truth, and web + store releases stay in sync.

Prerequisites (strict — stores will reject without these):

- Touch controls and mobile layout fully working (section 0 checklist).
- Save/resume via localStorage (WebView storage persists per app).
- App icons, splash screens, display name, and version per game.
- Privacy: no data collection → "No Data Collected" label (keep it that
  way — no analytics SDKs, no ads, especially for kids games).
- Apple's Kids category forbids third-party ads/analytics — our games
  comply by design; just don't add any.

iOS path:

1. One-time: Apple Developer Program enrollment ($99/year).
2. `npm install` Capacitor in a small wrapper per game pointing
   `webDir` at `<game>/`, `npx cap add ios`, open in Xcode.
3. TestFlight for testers, then App Store review (~1–3 days typical).

Android path:

1. One-time: Google Play developer account ($25 once).
2. Same Capacitor wrapper: `npx cap add android`, build signed AAB in
   Android Studio, Play review.

Stepping stone (optional, free): ship each game as an installable PWA
(manifest + icons + service worker — trivial here since games are fully
offline) so mobile players can Add to Home Screen without store review.

## 4. Release checklist (every game, every release)

- [ ] Played start-to-win on desktop + one mobile browser.
- [ ] Version bumped (visible in-game or filename, so testers confirm).
- [ ] Pushed to `main` → GitHub Pages updated.
- [ ] Cloudflare Pages production deploy green (or auto-deployed).
- [ ] If store build: Capacitor sync, TestFlight/Play internal track first.

## 5. Costs summary

| Channel          | Cost                                   |
|------------------|----------------------------------------|
| GitHub Pages     | free (public repo)                     |
| Cloudflare Pages | free (unlimited static bandwidth)      |
| Custom domain    | ~$10/year per domain (registrar)       |
| Apple App Store  | $99/year                               |
| Google Play      | $25 one-time                           |

## 6. Current games

| Game       | Folder      | Web status | Store status |
|------------|-------------|------------|--------------|
| 99 Nights  | `99nights/` | GitHub Pages: https://makingmusic.github.io/games/99nights/ | not yet |
| Escape the Cat Inside the Forest | `escapethecatinsidetheforest/` | GitHub Pages: https://makingmusic.github.io/games/escapethecatinsidetheforest/ | not yet |

Update this table as each game ships somewhere.
