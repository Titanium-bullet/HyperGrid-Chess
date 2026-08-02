# HyperGrid Chess

> A neon cyberpunk chess experience — play vs AI, two-player, or solve puzzles.

HyperGrid Chess is a single-player meta-game platform built around a fully-featured
chess client. Beyond the board, it bundles a tactical puzzle academy, an in-browser
arcade fighting game, a simulated banking economy, a cosmetics shop, and an
achievement system — all wrapped in a neon UI and exported as a static site that
deploys to GitHub Pages.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4)
![License](https://img.shields.io/badge/license-Unlicensed-lightgrey)

> 🎁 **Free unlimited-coin card available now!** For a limited time, the **Aesculapius**
> card can be opened **at no cost** on the **Bank of Hypergrid** page (Finance → Banking →
> Cards). It makes every shop purchase free — all boards, piece sets, powerups, and
> backgrounds, plus the cinematic **Luxury Car 🏎️ / Cruise Ship 🚢 / Private Island 🏝️**
> gift effects. Pick one up and experience the entire catalog.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Game Modes](#game-modes)
- [AI Opponents](#ai-opponents)
- [Arcade: Neon Versus](#arcade-neon-versus)
- [The Finance System](#the-finance-system)
- [Shop & Economy](#shop--economy)
- [Achievements](#achievements)
- [Customization](#customization)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Screenshots](#screenshots)
- [License](#license)

---

## Overview

HyperGrid Chess is a cyberpunk-themed chess hub. The core game is powered by
[chess.js](https://github.com/jhlywa/chess.js) for rule validation and
[chessboard.js](https://chessboardjs.com/) for the interactive board, with
**Stockfish 18 Lite** compiled to WASM running locally in a Web Worker as the
opponent engine. There is no server — every match, puzzle, transaction, and unlock
is computed and persisted entirely client-side via `localStorage`.

The project is organized into five pillars:

| Pillar | What it is |
| --- | --- |
| ♟️ **Chess** | Play vs AI (5 personalities), local two-player, or timed — with hints, threat detection, an eval bar, and more. |
| 🧩 **Puzzle Academy** | 30 tiered puzzles plus a boss-rush "Monster Trial" against SPECTRE. |
| 🎮 **Arcade** | *Neon Versus* — a standalone 2-player fighting game (GLITCH vs FORGE). |
| 🏦 **Finance** | *Bank of Hypergrid* — cards, loans, investments, insurance, and exchange. |
| 🛒 **Shop & Achievements** | A coin-driven cosmetics store, an AI affinity system, live-gift effects, and 24 tiered achievements. |

---

## Features

### Chess Core
- Full rule enforcement via **chess.js** — move validation, check, checkmate, stalemate, threefold repetition, insufficient material, castling, and en passant.
- **Promotion** picker (Queen / Rook / Bishop / Knight).
- **Material advantage** tracking with captured-piece trays.
- **Move history** in algebraic notation (SAN).
- **Timers** with increment support and win-on-time.
- **Game over**, **settings**, and **promotion** modals.

### Powerups (one-time shop unlocks)
| Powerup | Effect |
| --- | --- |
| **Legal Move Highlights** | Shows legal destinations when picking up a piece. |
| **Threat Alert** | Scans the position and flags undefended pieces and mate threats. |
| **Eval Bar** | A vertical evaluation bar driven by Stockfish (`cp` / `mate`). |
| **Undo Pack** | Removes the 3-undo limit — unlimited undos. |
| **Best Move Hint** | Queries Stockfish at depth 15 and draws an SVG arrow for the best move. |

### Meta Systems
- **Coins** — earned from wins and puzzles, spent in the shop.
- **Affinity** — send gifts to AI opponents to build a relationship (Stranger → Soulmate).
- **Live gifts** — luxury purchases trigger streaming-style particle effects with combos.
- **24 achievements** across 6 categories, each with Bronze / Silver / Gold tiers.
- **Client-side persistence** — all progress saved to `localStorage`.

---

## Game Modes

Accessed via **Home → Play → Select Mode**.

### Versus AI
Choose an opponent (see [AI Opponents](#ai-opponents)), then a time control. Stockfish
runs locally as a WASM Web Worker; skill level and search depth scale per difficulty,
and lower-skill AIs occasionally blunder on purpose.

### Two-Player (Local)
Pass-and-play on one device with shared or independent timers.

### Puzzle Academy
30 hand-authored puzzles across three tiers, each tier gated behind the previous:

| Tier | Focus |
| --- | --- |
| **Rookie** | Basics — find mate, win material. |
| **Tactical Strikes** | Forks, pins, discoveries. |
| **Master Challenges** | Sacrifices, multi-move sequences, endgames. |

Solve a puzzle by playing the expected move; the opponent replies automatically from
the solution line. Wrong moves flash the board and reveal the correct continuation.
Each puzzle offers a **Retry** and a **Hint**. Solving every puzzle unlocks the
**Monster Trial**.

### Monster Trial
A full-game boss fight against **SPECTRE** (~1800 ELO) — the rival persona that taunts
you throughout the puzzle academy.

### Time Controls
- **Bullet:** 1+0, 1+1, 2+1, 3+0, 3+2
- **Blitz:** 5+0, 5+3, 5+5, 10+0
- **Rapid:** 15+10, 30+0, 30+20
- **No Time Limit:** ∞

---

## AI Opponents

| Difficulty | Name | Approx. ELO | Notes |
| --- | --- | --- | --- |
| 1 | **Nova** | ~600 | Beginner. |
| 2 | **Phantom** | ~1400 | Intermediate. |
| 3 | **Overlord** | ~1800 | Advanced (also pilots SPECTRE in the Monster Trial). |
| 4 | **HyperGrid** | 3000+ | Master-level. |
| 5 | **Blind** | ~1000 | **Blindfold mode** — your pieces are hidden except the one under the cursor. |

**SPECTRE** (id `6`) is the Puzzle Master and the recurring antagonist of the Monster
Trial. You can also send gifts to SPECTRE to raise affinity.

---

## Arcade: Neon Versus

A complete fixed-timestep (60 FPS) fighting game running on an HTML canvas, separate
from chess. Two characters share one keyboard in a best-of-3 match with full rounds,
super meter, hitstop, screen shake, and particle effects.

### Characters
| Fighter | Style | HP | Walk Speed | Special |
| --- | --- | --- | --- | --- |
| **GLITCH** | Lean, erratic, blindingly quick. | 92 | 7.2 | Fast small projectile. |
| **FORGE** | Slow, armored, devastating brute. | 122 | 5.0 | Slow heavy low projectile. |

Each fighter has four palette swaps and three attacks: **punch**, **kick**, and
**special** (projectile, costs meter).

### Controls
| | Move / Jump | Punch | Kick | Special |
| --- | --- | --- | --- | --- |
| **P1 (left)** | `W` `A` `S` `D` | `F` | `G` | `H` |
| **P2 (right)** | Arrow keys | `J` | `K` | `L` |

`Esc` / `P` to pause, `?` opens the in-arena help overlay.

---

## The Finance System

The **Bank of Hypergrid** is a simulated banking layer that interacts with the in-game
economy. Open a card, build credit, take out loans against your shop inventory, invest,
and insure yourself against losses.

### Card Tiers
| Tier | Card | Type | Limit | Cashback | Perks |
| --- | --- | --- | --- | --- | --- |
| 1 | **Everyday** | Debit | 5,000 | — | Daily essentials. |
| 2 | **Plus** | Debit | 15,000 | 1% | Upgraded perks. |
| 3 | **Gold** | Credit | 60,000 | 2% | Unlocks unsecured loans, lounge access. |
| 4 | **Platinum** | Credit | 250,000 | 3% | Lowest APR, concierge. |
| 5 | **Aesculapius** | Credit | ∞ | 5% to charity | Unlimited credit — all shop purchases are free. By invitation. |

### Services
- **Loans** — Unsecured (Gold+ only) or secured by your owned shop items as collateral.
  Monthly amortized payments; APR and limits scale with card tier.
- **Investments** — Saving (3% APY), Term Deposit (6.5%), or Fund (11%, higher risk).
  Advance days manually and withdraw matured principal plus projected interest.
- **Insurance** — Life-insurance annuity products plus one-time perks: **No Rating Loss**
  and **No Coin Loss**.
- **Currency Exchange** — Purchase coin packages (demo only — no real payment processed).

---

## Shop & Economy

Everything is priced in **coins** 🪙, earned from wins and puzzles and spent in the shop.

### Categories
| Category | Items |
| --- | --- |
| **Boards** | 8 themes (Midnight, Shadow, Rose, Neon City, Arctic, Inferno, Matrix, Royal). |
| **Pieces** | 6 sets (Pixel, Alpha, Merida, Tatiana, CBurnett, Maestro). |
| **Powerups** | 5 one-time unlocks (see [Features](#features)). |
| **Backgrounds** | Basic, Nexus, Spectra (reveals hidden pieces with a wave), Arcade (CRT cabinet). |
| **Gifts** | Send to AI opponents to raise affinity — including luxury gifts that trigger live effects. |

### Mechanics
- **Buy / Equip / Sell** — selling refunds 80% of the price.
- **Aesculapius card holders** get every purchase for free.
- **Affinity levels** — Stranger → Acquaintance (10) → Friend (50) → Close Friend (150) → Soulmate (300).
- **Live gifts** — sending a Luxury Car 🏎️ / Cruise Ship 🚢 / Private Island 🏝️ triggers a
  full-screen particle effect with rarity tiers (Epic / Legendary / Mythic) and a combo counter.

---

## Achievements

**24 achievements** across **6 categories**, each with **Bronze / Silver / Gold** tiers
that award coins on unlock (10 / 25 / 50 respectively). Silver and Gold triggers a screen
flash and a Gold unlock shakes the screen.

| Category | Examples |
| --- | --- |
| **Victories** | First Blood, per-AI slayers (Nova / Phantom / Overlord / HyperGrid / Blind). |
| **Puzzles** | Per-tier solvers — Gold requires clearing the tier **without hints**. |
| **Trial** | Spectre Challenger, Spectre Slayer. |
| **Moves** | En Passant, Castle Master, Promotion Master, Queen Hunter. |
| **Challenges** | Speed Demon (fast wins), Iron Defense (few losses), On Fire (streaks), Dark Side, PvP Warrior. |
| **Stats** | Dedicated Player, Centurion, Marathon, Completionist. |

The achievements page also shows a full statistics grid: games, wins, win-rate, best
streak, puzzles solved, moves played, total play time, and medals earned.

---

## Customization

- **8 board themes:** Cyber, Dark, Neon, Inferno, Arctic, Royal, Matrix, Rose.
- **6 piece sets** (served from the Lichess asset CDN).
- **Synthesized audio** via the Web Audio API — move, capture, check, game-over,
  achievement jingles, and the full arcade SFX palette (punch, kick, special, block,
  hit, KO, round bell). Toggle in settings.
- **Blindfold mode** via the *Blind* AI opponent.

---

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 15** (App Router, `output: 'export'`) |
| UI | **React 19**, **Tailwind CSS 4**, CSS Modules |
| Language | **TypeScript 5.7** (strict) |
| Chess logic | **chess.js 0.10.3** (loaded from CDN) |
| Chess UI | **chessboard.js 1.0.0** + jQuery 3.5.1 (loaded from CDN) |
| Engine | **Stockfish 18 Lite** (WASM, served locally, runs in a Web Worker) |
| Audio | **Web Audio API** (fully synthesized — no audio files) |
| State | `localStorage` with a custom event bus |
| Fonts | Orbitron (display) + Inter (body), via `next/font` |

No runtime dependencies beyond React and Next — chess.js, chessboard.js, jQuery, and
Stockfish are loaded at runtime.

---

## Getting Started

### Prerequisites
- **Node.js 20+**
- **npm** (a lockfile is committed, so `npm ci` is preferred)

### Install
```bash
npm ci
```

### Develop
```bash
npm run dev
```
Then open <http://localhost:3000>. (When developing locally, `NEXT_PUBLIC_BASE_PATH`
is unset, so no base path is applied.)

### Type-check
```bash
npm run typecheck
```

### Production build
```bash
npm run build
```
The static export is written to `./out`.

---

## Deployment

HyperGrid Chess is a **static site** (`output: 'export'` in `next.config.ts`) deployed
to **GitHub Pages**.

- The GitHub Actions workflow at `.github/workflows/nextjs.yml` builds and deploys on
  every push to `main` (and via manual dispatch), using Node 20 and `npm ci`.
- `.env.production` sets `NEXT_PUBLIC_BASE_PATH=/HyperGrid-Chess` so the export is
  served from `https://<user>.github.io/HyperGrid-Chess/`. Change this value to match
  your repository name.
- `images.unoptimized: true` and `reactStrictMode: true` are set for static export.

To deploy under a different path or custom domain, update `NEXT_PUBLIC_BASE_PATH` (or
clear it for a root domain) and re-run the workflow.

---

## Project Structure

```
HyperGrid-Chess/
├── app/                      # Next.js App Router pages
│   ├── about/                # Lore + feature index
│   ├── achievements/         # Achievement tracker + stats
│   ├── arcade/               # Neon Versus fighting game
│   ├── finance/              # Bank of Hypergrid hub + banking dashboard
│   ├── game/                 # Core chess client (GameClient.tsx)
│   ├── play/                 # Mode picker → AI select / time control
│   ├── puzzles/              # Puzzle Academy
│   ├── shop/                 # Cosmetics + gifts
│   ├── HomeMenu.tsx          # Landing navigation
│   └── layout.tsx            # Fonts, metadata, global toast host
├── components/               # React components
│   ├── arcade/               # ArenaCanvas, CharSelect
│   ├── finance/              # Cards, loans, investments, insurance, exchange
│   └── game/                 # Board.tsx (chessboard.js integration)
├── lib/                      # Domain logic (framework-agnostic)
│   ├── arcade/               # Fighting-game engine + characters + controls
│   ├── live-gift/            # Streaming-style gift particle/effects system
│   ├── achievements.ts       # 24 achievements + stat tracking
│   ├── ai-opponents.ts       # 5 AI personalities + SPECTRE
│   ├── engine.ts             # Stockfish Web Worker wrapper (UCI)
│   ├── finance.ts            # Cards, loans, investments, insurance
│   ├── game-audio.ts         # Synthesized Web Audio SFX
│   ├── puzzles.ts            # Puzzle definitions
│   ├── shop.ts               # Shop items, coins, affinity
│   └── storage-keys.ts       # localStorage schema
├── public/                   # Static assets
│   ├── data/puzzles.json     # 30 puzzles + Monster Trial
│   ├── engine/               # Stockfish 18 Lite WASM
│   └── images/
├── next.config.ts            # Static export + basePath
└── .github/workflows/        # GitHub Pages deploy
```

---

## Roadmap

HyperGrid Chess is under active development. The following are available and being
expanded:

- 🎲 **3D Chess Beta** — a three-dimensional board variant (in beta).
- 🌐 **Play Online** — real-time multiplayer matchmaking.
- 🎰 **Entertainment** — an in-finance entertainment hub (games of chance, jackpots).
- More puzzles, more opponents, and more arcade fighters.

---

## Screenshots

> Add images to `public/images/` and update the paths below.

| Home | In-Game |
| --- | --- |
| ![Home](./public/images/screenshot-home.png) | ![Game](./public/images/screenshot-game.png) |

| Puzzle Academy | Arcade: Neon Versus |
| --- | --- |
| ![Puzzles](./public/images/screenshot-puzzles.png) | ![Arcade](./public/images/screenshot-arcade.png) |

---

## License

This project does not currently include a license file and is therefore
**all rights reserved** by default. If you intend to fork, redistribute, or reuse the
code, add a `LICENSE` file (e.g., MIT) and update this section accordingly.
