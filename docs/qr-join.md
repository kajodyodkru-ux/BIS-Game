# QR room entry

The host opens `/host` and selects **Create live room**. Each room gets a six-digit PIN, a QR code, a copyable join link, and a live roster. The host starts the news briefing after teams arrive. The room accepts up to ten teams and lasts 24 hours.

Players scan the QR with their phone camera, enter a nickname/team name, and join. The QR includes the PIN. One device represents one team portfolio. A secure, HttpOnly room cookie reconnects that browser to the same team after a reload; the confirmed allocation is stored in D1. New teams cannot join after the first briefing starts. Full, expired, invalid, and closed rooms show explanatory messages.

The host reads the news, opens allocations, then closes and reveals the round. Until the reveal, the API withholds the year, dates, market-return paths, recap, and dated source links. Unsubmitted teams retain their current holdings when the host confirms the carry-forward action. The sequence is 2021 → 2022 → 2024 → 2025 → 2020 → 2023. Financial accounting is unchanged. The 2024 briefing uses the December 13, 2023 Federal Reserve statement, available before that year began.

## Public player access

The owner requested public player access on September 28, 2026. Players can open the join page without an account and use a room QR/PIN. A PIN selects the room; the host must keep the lobby open. Host pages and every host API remain restricted to the signed-in configured `HOST_EMAIL`. Team portfolios still require their individual secure room-session cookie.

## Fixes in this version

- Mobile entry focuses the name field when a QR supplies a valid PIN.
- Live room-status checks prevent joining unavailable rooms.
- Dedicated join code replaces the unreachable legacy player implementation.
- Host buttons recover from the busy state after a successful transition; previously they could remain disabled after starting the briefing.
- Outdated polling responses cannot replace a newer host/player revision.
- A polling request for an old room cannot reopen it after navigating back to the room list.
- Added an explicit link to open the player page and a visible explanation of private access.

## Verification — 2026-09-28, Asia/Bangkok

`node scripts/verify.mjs` checks all six historical paths, returns, dated news cutoffs, drawdowns, balance carry-forward, phase guards and awards.

`node scripts/verify-player.mjs` checks every player state, allocation validation, hidden-year rendering, names, room capacity and closure.

`node scripts/verify-flow.mjs` passed against the built production Worker and an isolated local D1 database using Chromium, a desktop host, and separate mobile browser sessions at widths 360, 375 and 390 pixels. It independently decoded the rendered QR with ZXing, joined two teams, rejected duplicate names and unauthorized host actions, verified reconnect and saved allocations, confirmed the hidden API fields, completed all six rounds, checked simultaneous submissions and numerical results, and checked final awards, ended rooms and invalid PINs. No browser exceptions or horizontal page overflow were found. This is browser emulation, not a physical-phone camera test.

The browser suite uses test identities only on a local loopback Worker. It does not change production sharing or impersonate production visitors. It requires Playwright, Chromium, Python with Pillow and zxing-cpp, the compiled `dist/`, and the initial migration applied to the local D1 database. It starts and stops its own loopback server. `CODEX_PRIMARY_RUNTIME_NODE_MODULES` can point to the supplied Playwright installation; `QA_CHROMIUM_EXECUTABLE` can select a local Chromium executable. In the recorded run, QA dependencies were installed under ignored `.sites-runtime/`; screenshots and machine-readable results are written to ignored `work/`.

Build and type checking also passed. Live publication and the public access policy are verified separately through Sites. Anonymous visitors may join rooms but cannot operate host controls.

New rooms use the revised 2024 sequence. Existing saved rooms retain their original 2017 round to avoid changing results during a session. Start a new room to use the update.

New rooms now also include China stocks (MCHI) and Thai stocks (THD), using USD ETF adjusted returns. Charts, allocation controls, P/L tables and practice portfolios include all seven assets. Existing rooms retain their original five-asset set.
