# Historical team investment game

## Round order and information boundary

2021 → 2022 → 2024 → 2025 → 2020 → 2023, as selected by the user.
Each round starts with two news cards paraphrased from the Federal Reserve statement published in December of the preceding year. The publication dates are recorded in `game/scenarios.mjs`; every source predates January 1 of its round. No in-year developments are included in the pre-round briefing. The 2020 pre-round briefing therefore does not announce the later pandemic crash or recovery.

Years, source dates, source links, annual returns, and the year's price path appear only after the host completes that round. Completed round information remains available. Unrevealed price data and dated sources remain on the server. Team responses expose only the current briefing until the host reveals it.

## Asset definitions and market data

- Cash: 0% by game rule, not a historical interest-bearing deposit.
- Bitcoin: BTC-USD daily USD close, UTC dates.
- Gold: GLD, SPDR Gold Shares ETF. This is fund performance after expenses, not the spot bullion fixing.
- Government bonds: IEF, iShares 7–10 Year Treasury Bond ETF. This is an investment return, not a change in Treasury yield.
- U.S. stock index: SPY, SPDR S&P 500 ETF. This is fund performance, not the raw price-only index.

- China stocks: MCHI, iShares MSCI China ETF. Chinese equities accessible to international investors; not a mainland-only index.
- Thai stocks: THD, iShares MSCI Thailand ETF. Thai equity exposure; not the SET Index.

MCHI and THD use USD adjusted closes including distributions and embedded currency effects. Their returns differ from local-currency indices and official fund NAV returns. All seven choices use the same USD comparison basis. Source definitions:
- https://www.ishares.com/us/products/239619/ishares-msci-china-etf
- https://www.ishares.com/us/products/239688/ishares-msci-thailand-capped-etf

ETF adjusted closing prices reflect distributions and splits; returns are nominal USD with no currency conversion, investor taxes, or trading fees. Provider rounding/revisions, exchange closes, ETF expenses, and reinvestment conventions can make these returns differ from official NAV, index, or spot-price tables. Original dataset downloaded from Yahoo Finance on September 26, 2026; MCHI and THD added September 28, 2026; source URLs, retrieval timestamps and SHA-256 checksums are retained in `price-sources.json`, with full raw responses in `raw/`.

Instrument definitions:
- https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy
- https://www.spdrgoldshares.com/usa/gld/
- https://www.ishares.com/us/products/239456/ishares-7-10-year-treasury-bond-etf

## Transformation

For each year and asset, let B be the last available adjusted closing observation strictly before January 1. Each year begins with an explicit index of 100. Every day's index is 100 × adjusted_close / B, and return percent is index − 100. Final return uses December 31, or the latest available ETF close before that date.

The game uses calendar-day observations. ETF closes carry forward on nontrading days; no price interpolation is used. Bitcoin observations are required for every calendar day. U.S. exchange closing dates and Bitcoin UTC daily dates are aligned by calendar date; the underlying times of day are not simultaneous.

The reproducible build script verifies source hashes, dates, positive prices, duplicate dates, and complete Bitcoin observations. The resulting daily path is frozen in `game/history.mjs`. The user can isolate each asset in the chart so large Bitcoin returns do not obscure the other paths.

## Portfolio accounting

At each round boundary, the team's entire existing portfolio value is allocated to the chosen starting weights. The allocation is held through the year; there is no midyear rebalancing. Asset weights drift naturally. ETF distributions remain reflected in the adjusted-return asset sleeve.

At every daily step, portfolio value = sum(starting capital × initial asset weight × that asset's indexed return factor). The last daily value becomes the next round's starting wealth. The index resetting to 100 is not a loss or reset of team wealth. No actual-price conversion is made between nonconsecutive years.

The largest peak-to-trough loss over all daily portfolio observations is the game's maximum drawdown. It is a daily-close approximation, not intraday maximum drawdown. Portfolio peaks are not reset between rounds. Rankings use full precision; display values are rounded.

## Validation and limitations

`scripts/verify.mjs` exercises all six years with 6–10 teams, the formula for compounded wealth, holdings and P/L reconciliation, full-path drawdown, cash-only control, phase guards, source locks, rendered-year hiding, source reveal, recaps, awards, reset, and the requested palette. A stock-only 2020 control ends positive while recording a drawdown greater than 30%, ensuring year-end recovery cannot erase interim risk.

News source contents were inspected against the six dated original Federal Reserve releases. Price results were checked against the raw responses, with external annual-return spot checks during sourcing. No independent licensed market-data audit is claimed. Selected years are intentionally shuffled and not a representative investment backtest. Team strategies are deterministic demonstrations, not AI analysis of the briefings. Live rooms support up to ten team devices. Rooms and confirmed allocations are stored on the server for 24 hours. A secure room cookie reconnects the same browser after refresh. Private website access is separate from the room PIN; see `docs/qr-join.md`.

See `docs/qr-join.md` for recorded multiplayer/browser validation and its limits. This update reruns historical accounting and player rendering tests with the revised 2024 round. No physical iPad or camera test is claimed.

## Regional asset validation

The builder verifies that MCHI and THD have exactly the SPY trading-date coverage in the retained dataset. Original data remain unchanged. `verify-regional.mjs` tests 100% China/Thailand allocations through each year, independent drawdown calculations, new-asset chart rendering, and compatibility with saved five-asset rooms. New rooms have seven assets; existing rooms retain their original five assets and original round sequence.
