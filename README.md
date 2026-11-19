[![make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun/)
[![Rank](https://make.fun/badge/token-radar-01/xnightgarap-95jp/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01)
[![Reward](https://make.fun/badge/token-radar-01/xnightgarap-95jp/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01)

# Token Launch Radar

An entry for [make.fun](https://make.fun/) — the token launch radar bounty
(token-radar-01). It ranks the protocols that record no token yet by what
their launch would be worth, and shows how to farm each one.

## What it does

`main.ts` (Node 22, standard library only) reads the sealed DefiLlama
snapshot at `/input/snapshot.json` and writes to `/output`:

- `board.json` — 198 ranked rows: all 40 watchlist protocols plus 158 early
  ones below the $50M floor, each with an implied value and a 6-step farm plan.
- `data.js` — the same board for the dashboard, plus the 15 largest
  protocols whose token already trades (listed apart, never ranked).
- `dashboard/` — the static page (sortable, filterable, detail view).
- `screenshots/` — board, detail and filtered views.
- `dossier.json` — built with `buildDossier` from `vendor/makefun-board.ts`.

## The value model

```
implied = TVL × category multiple × growth factor × age factor
growth  = 1 + clamp(change_7d, -25, +25) × 0.012
age     = 0.85 + 0.35 × min(ageDays, 730) / 730
```

Every figure comes from the snapshot. Multiples are set by category
(deposit-heavy categories score higher), never by protocol name. A protocol
is a candidate when the snapshot records no token for it and it is not a
wrapped, staked or bridged product of a token that already trades.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path-to-snapshot.json>
```

Then open `out/dashboard/index.html` in a browser (no network needed).
