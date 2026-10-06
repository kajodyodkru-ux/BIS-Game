# BBA Market Room — full game source

This is the source of the published investment game, version 14, commit
`6c32c8e17a417f2e367d27e30541c64624572bd7`. It is the hosted application,
not the earlier Windows/local-server edition. Later unpublished skeleton-loading
changes are not part of this published snapshot.

## What you can do with this package

Upload this folder to a GitHub repository to keep and edit the full source.
**Uploading to GitHub does not by itself deploy the multiplayer game.**
GitHub Pages hosts static content; this application also needs a running backend,
persistent room database, and host authentication.

Reference: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

## Upload to GitHub

1. Extract the ZIP and open the `bba-market-room` folder.
2. Create an empty GitHub repository named `bba-market-room`. Do not initialize
   it with another README, license, or .gitignore.
3. With Git installed, open a terminal in this extracted folder and run:

```sh
git init
git add .
git commit -m "Import BBA Market Room game source"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/bba-market-room.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. Complete GitHub's sign-in
prompt if requested. Upload the source folder contents, not just the ZIP.
Keep `.gitignore`, `.npmrc`, and `.openai/hosting.json` in the repository.
Never commit access tokens, environment secrets, or live room databases.

## Deployment status and required work

This export preserves the hosted application's implementation. It has NOT been
converted to GitHub Pages, AWS, or another hosting provider, and it has not been
deployed from GitHub. The existing online game was not changed by the export.

The current runtime is Vinext/React on Cloudflare Workers with Cloudflare D1.
These are the parts to address before deploying outside the original platform:

| Part | Current code | External hosting requirement |
| --- | --- | --- |
| Host identity | `app/chatgpt-auth.ts`, `app/host/page.tsx`, `lib/game-api.ts` | Replace platform-owned ChatGPT sign-in with your chosen host authentication and server-verified sessions. |
| Room storage | `lib/db.ts`, `db/`, `drizzle/` | Provision a database and apply the schema. Keep D1 for a compatible Worker setup, or adapt the queries/driver for your chosen database. |
| Runtime/build | `vite.config.ts`, `build/`, `scripts/` | Configure the selected hosting platform. This is not a generic Node `server.js` app or a static site. |
| Public address | Same-origin API and QR links | Serve the frontend and backend together over HTTPS, or deliberately implement cross-origin sessions and API routing. |
| Persistence | `game_rooms` table | Preserve room state across requests and deployments; keep revision checks to avoid simultaneous submissions overwriting one another. |

The `oai-authenticated-*` request headers are trusted only when the original
platform supplies and protects them. Do not trust headers sent directly by
visitors on a new host. Do not replace the host check with an always-true check.
Players already use nicknames, room PINs and room cookies; they do not need host
accounts. Preserve host ownership checks and HTTPS cookies when porting.

The original Site project ID has been removed from `.openai/hosting.json` so
this copy is not configured to publish back to the existing Site. The `DB`
binding declaration remains because the build imports this file. It does not
contain database credentials or a production database.

## Included gameplay

- 6–10 teams, one shared device per team; host-controlled rounds.
- Assets: cash, BTC, gold (GLD), government bonds (IEF), US stocks (SPY),
  China stocks (MCHI), and Thai stocks (THD).
- Round order: 2021, 2022, 2024, 2025, 2020, 2023.
- Pre-round news with years hidden until the reveal.
- Daily historical return paths, animated recap charts, portfolio breakdowns,
  and leaderboards.
- Awards for highest final return and lowest drawdown among teams in the top
  half by final return.
- QR/PIN joining, saved team allocations, and 24-hour rooms.

See `research/METHODOLOGY.md` for data definitions and accounting conventions.
Frozen historical data and retained source responses are included.

## Source map

- `public/`: host/player interfaces, graph animation, CSS and club logo.
- `game/`: portfolio engine, historical scenarios, data and multiplayer rules.
- `app/`: pages, layout, authentication helper and API route.
- `lib/game-api.ts`: room creation, joining, allocation and host operations.
- `db/` and `drizzle/`: storage adapters and database schema/migration.
- `scripts/`: build helpers, historical data builder and verification scripts.
- `SOURCE-EXPORT.json`: original commit, per-file checksums and export changes.
- `docs/ORIGINAL-STARTER-README.md`: retained build/local-development documentation.

## Verification

The pure JavaScript checks below need Node.js 22.13 or newer and no dependency
installation. Run them from this folder:

```sh
node scripts/verify.mjs
node scripts/verify-player.mjs
node scripts/verify-regional.mjs
```

These check game accounting, player states and regional assets. They do not
prove that a new hosting provider, host login, database connection, or live QR
joining is configured. Test those together after the external deployment is set up.

The app's dependency versions are pinned by `pnpm-lock.yaml`; package manager
and Node requirements are recorded in `package.json`. Use the same package
manager for installation. Full-framework build instructions retained from the
original starter still assume its Worker/Sites integration.

No live rooms, visitor identities, runtime secrets, installed dependencies,
compiled bundles, or Git credentials are included in this source export.
