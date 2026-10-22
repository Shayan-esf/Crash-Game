---
name: Crash Game
description: Telegram-native multiplayer arcade crash game powered by virtual credits
colors:
  primary: "#facc15"
  primary-hover: "#eab308"
  action-green: "#16a34a"
  action-green-hover: "#15803d"
  crash-red: "#dc2626"
  void-black: "#181a20"
  surface-card: "#1f2937"
  surface-elevated: "#374151"
  text-primary: "#ffffff"
  text-muted: "#9ca3af"
  border-subtle: "#374151"
typography:
  display:
    fontFamily: "Raleway, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Raleway, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Raleway, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Raleway, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-bet:
    backgroundColor: "{colors.action-green}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px 24px"
  button-cashout:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.void-black}"
    rounded: "{rounded.lg}"
    padding: "16px 24px"
  button-crashed:
    backgroundColor: "{colors.crash-red}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px 24px"
  chip-bet:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  card-panel:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Crash Game

## Overview

**Creative North Star: "The Cosmic Arcade"**

The visual world balances high-suspense arcade excitement with the sleekness of modern dark-mode mobile interfaces. Designed exclusively for the Telegram Mini App environment, the interface treats the screen as an illuminated cockpit window looking out into deep space: deep void blacks, velvety charcoal cards, and intense electric neon accents.

Every visual cue delivers instant feedback. Because rounds last only seconds and a fraction of a second determines whether a player doubles their score or loses their bet, visual hierarchy is decisive. The screen strips away administrative clutter, focusing attention entirely on the central flight canvas and the thumb-anchored action trigger.

**Key Characteristics:**
- Pitch-black void foundations layered with warm charcoal card surfaces.
- High-contrast semantic tri-state colors: Solar Gold (multiplier/cashout), Launch Green (active bet), and Nebula Crimson (crash event).
- Tactile, chunky controls optimized for rapid single-thumb mobile interaction.
- Space retro-arcade flair: parallax star fields, cosmic glow borders, and bold monospace telemetry numbers.

## Colors

The palette is tuned for high-contrast visibility against pitch-dark backdrops, combining deep space neutrals with high-energy luminous accents.

### Primary
- **Solar Gold** (#facc15): The iconic color of the game multiplier, coin balance, and active cashout action. Communicates wealth, triumph, and escalating excitement.

### Secondary
- **Launch Green** (#16a34a): The affirmative action color for placing bets, confirming successful cashout, and indicating active WebSocket connectivity.

### Tertiary
- **Nebula Crimson** (#dc2626): The critical warning and crash indicator. Appears exclusively when the rocket explodes, when a bet is lost, or when connection is dropped.

### Neutral
- **Void Black** (#181a20): The canvas and page root background. Establishes deep space immersion and saves battery on mobile OLED displays.
- **Surface Charcoal** (#1f2937): Card, modal, and panel background container tone.
- **Graphite Elevated** (#374151): Inner buttons, inactive chip selectors, and table dividers.
- **Starlight White** (#ffffff): Primary text for values, titles, and active labels.
- **Muted Comet** (#9ca3af): Secondary captions, timestamps, and inactive tab labels.

### Named Rules
**The Tri-State Semantic Rule.** Buttons and status indicators must strictly reflect the current round phase: Launch Green while waiting/betting, Solar Gold while rocket is airborne and cashout is primed, and Nebula Crimson the instant the crash occurs. Never mix these state colors.

**The Voltage Rule.** High-saturation accents (Solar Gold, Launch Green, Nebula Crimson) may occupy at most 15% of the total surface area. The remaining 85% must remain dark neutrals so that state changes flash with maximum perceptual impact.

## Typography

**Display Font:** Raleway (with sans-serif fallback)  
**Body Font:** Raleway (with sans-serif fallback)  
**Label/Mono Font:** ui-monospace (with SFMono-Regular, Menlo, Monaco, Consolas, monospace fallback)  

**Character:** Modern, clean geometric sans-serif paired with crisp tabular monospace digits for live counter telemetry.

### Hierarchy
- **Display** (800 weight, clamp(2rem, 5vw, 3.5rem), 1.1 line-height): The ascending multiplier counter positioned inside the game canvas. Must be instantly legible even in peripheral vision.
- **Headline** (700 weight, 1.5rem, 1.2 line-height): Section titles, modal headers, major balance readouts.
- **Title** (600 weight, 1.125rem, 1.3 line-height): Card headers, player usernames in leaderboards.
- **Body** (400 weight, 0.875rem, 1.5 line-height): Chat messages, explanations, history records.
- **Label** (700 weight, 0.75rem, 1.0 line-height, uppercase): Monospace currency tags, badge counters, status indicators.

### Named Rules
**The Telemetry Monospace Rule.** Any rapidly fluctuating numerical data (multiplier counter, live coin balances, round timer milliseconds) must use tabular monospace (`font-mono`) to prevent layout jitter as digits change.

## Layout

The layout is engineered specifically for the Telegram Mini App viewport:
- **Mobile Container**: Centered column constrained to max-width 483px (or 100% width on mobile screens < 480px).
- **Vertical Rhythm**: Fixed top header bar (56px / h-14), primary canvas viewport (16:9 aspect ratio), sticky or thumb-adjacent control dock, followed by scrollable history/chat tabs.
- **Thumb Zone Anchor**: Primary bet and cashout triggers sit in the lower third of the viewport, well within easy reach of one-handed thumb interaction.
- **Spacing Base**: 4px base grid with primary component increments of 8px (sm), 16px (md), and 24px (lg).

## Elevation & Depth

Surfaces rely on tonal dark layering complemented by radiant colored borders and soft glow halos rather than drop shadows.

### Shadow Vocabulary
- **Ambient Card** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5)`): Standard panel lift above the void background.
- **Golden Glow** (`box-shadow: 0 0 16px rgba(250, 204, 21, 0.35)`): Applied to selected bet chips and ready-to-cashout buttons to signal prime status.
- **Launch Glow** (`box-shadow: 0 0 16px rgba(22, 163, 74, 0.35)`): Applied to the active betting action button.

### Named Rules
**The Tonal Stratum Rule.** Elevate elements purely through background lightness: Void Black (#181a20) on floor -> Surface Charcoal (#1f2937) for cards -> Graphite (#374151) for inner controls. Never use light-colored drop shadows.

## Shapes

- **Radius Scale**: Standard panels, buttons, and chips use a continuous 12px (`rounded-xl` / 0.75rem) radius for a modern tactile feel. Secondary pills and status dots use `rounded-full`.
- **Borders**: 1px or 2px crisp outlines in Graphite (#374151) or luminous Solar Gold (#facc15). Hairline borders provide crisp separation on dark OLED screens without muddy contrast.

## Components

### Buttons
- **Shape**: Rounded rectangle (12px radius / `rounded-xl`).
- **Primary Bet Trigger**: Launch Green (#16a34a) background, Starlight White text, height 56px (`py-6`), bold 18px text.
- **Cashout Trigger**: Solar Gold (#facc15) background, Void Black text (#181a20), height 56px, bold 18px text with live multiplier calculation.
- **Crashed / Inactive State**: Nebula Crimson (#dc2626) background or Charcoal disabled state (opacity 50%).
- **Hover / Active**: Quick 100ms scale down (`scale-95`) on mobile tap; glow enlargement on desktop hover.

### Chips (Bet Presets)
- **Shape**: 12px radius (`rounded-xl`), 3-column equal grid for fixed bet amounts [10, 50, 100].
- **Unselected**: Graphite background (#374151), transparent border, Starlight White text.
- **Selected**: Solar Gold background (#ca8a04), 2px bright Solar Gold border (#facc15), subtle 1.05 scale and glow shadow.

### Cards / Containers
- **Corner Style**: 12px radius (`rounded-xl`).
- **Background**: Surface Charcoal (#1f2937) gradient towards Slate (#111827).
- **Border**: 1px subtle Graphite border (`border-gray-700/60`).
- **Padding**: 16px internal padding (`p-4`).

### Header Bar
- **Dimensions**: Fixed 56px (`h-14`), curved bottom corners (`rounded-b-xl`).
- **Centerpiece**: Pill-shaped balance badge with coin icon, monospace balance counter, and bright gold outline.
- **Status Dot**: 8px circular status indicator (Launch Green for WebSocket connected, Nebula Crimson for disconnected).

### Game Canvas Stage
- **Dimensions**: Adaptive 16:9 aspect ratio, minimum height 400px.
- **Atmosphere**: Deep space gradient (`#0a1833` to `#1e1e1e`), multi-layer parallax star field, rocket sprite flight path, and particle explosion VFX.

## Do's and Don'ts

### Do:
- **Do** anchor the primary action button to the bottom thumb zone for effortless one-handed play.
- **Do** use tabular monospace (`font-mono`) for all live multiplier numbers and coin balances.
- **Do** apply Solar Gold exclusively to currency, current multiplier, and cashout events.
- **Do** support dark mode natively by anchoring the root surface to Void Black (#181a20).
- **Do** provide visual pulse and state changes in under 100ms when bets are placed or cashed out.

### Don't:
- **Don't** introduce light or white backgrounds anywhere in the interface; the game world is strictly dark space.
- **Don't** add complex multi-step betting sliders; stick to quick-tap preset chips (10, 50, 100) for fast round turnaround.
- **Don't** use low-contrast gray text on dark cards; keep all labels at or above WCAG AA contrast (minimum `#9ca3af` for secondary text).
- **Don't** allow desktop horizontal overflows or vertical layout jumps when the multiplier ascends.
