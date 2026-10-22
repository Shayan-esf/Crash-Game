# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Telegram users on mobile and desktop seeking fast-paced, high-thrill casual gaming directly within the Telegram messenger without app installations or financial risk.

## Product Purpose

Deliver a real-time multiplayer crash arcade game where players wager virtual credits against an exponentially rising rocket multiplier. Success is measured by round excitement, frictionless social interaction, fast round turnaround, and sticky replayability.

## Positioning

A friction-free, Telegram-native social crash game running entirely on virtual credits. Combines the suspense of classic crash mechanics with casual social gaming—zero real-money barriers, instant Telegram onboarding, shared multiplayer rounds, and community chat.

## Operating Context

- Environment: Telegram Mini App (mobile portrait WebView and desktop modal).
- Input: Touch-first single-hand mobile interactions, quick responsive taps.
- Network: Variable mobile connections requiring robust WebSocket reconnection and state catch-up.
- Audio: Often played in public or muted environments; visual feedback must be fully self-sufficient.

## Capabilities and Constraints

- Capabilities:
  - Real-time multiplayer game loop (betting countdown, flying multiplier, sudden crash).
  - Synchronized multiplier canvas rendering (rocket launch, flight curve, crash explosion).
  - Virtual betting with preset denominations (10, 50, 100 credits) and single-tap cashout.
  - Telegram Mini App authentication (Telegram ID, username, avatar integration).
  - Social features: live lobby chat, shared game history, top session records.
  - Admin management: user oversight, game statistics, system controls.
- Constraints:
  - Strictly virtual currency (no fiat or crypto deposits/withdrawals).
  - Must conform to Telegram WebView height constraints without triggering pull-to-refresh or accidental outer scrolling.

## Brand Commitments

- Space arcade theme: rocket, cosmic backdrop, planetary elements, explosion VFX, dynamic sound effects.
- Tone: Exciting, playful, competitive, transparent.

## Evidence on Hand

- Next.js 15 App Router application structure in `app/`.
- WebSocket game server in `ws-server.js` and `server/index.js`.
- Prisma database schema for users, games, sessions, and messages in `prisma/schema.prisma`.
- Visual components and canvas renderers in `components/crash/`.
- Asset manifests in `public/assets/` and `public/sounds/`.

## Product Principles

1. Instant Clarity: Phase status, current multiplier, and cashout values must be legible in a split-second.
2. Low-Latency Response: Cashout and betting actions must register instantaneously with definitive feedback.
3. Telegram-Native Ergonomics: All primary action controls must sit comfortably within the mobile thumb zone.
4. Resilient Synchronization: Client cleanly recovers game phase and balance state across disconnects and backgrounding.

## Accessibility & Inclusion

- High-contrast multiplier typography readable on dark backgrounds across all lighting conditions.
- Audio cues paired with distinct visual animations for all key events (launch, cashout, crash).
