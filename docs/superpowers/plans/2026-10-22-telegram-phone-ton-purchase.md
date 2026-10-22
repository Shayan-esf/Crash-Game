# Telegram Phone Verification, TON Purchase & Referral System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Telegram phone verification gate in bot and webapp, clickable coin header opening a Cosmic Arcade TON purchase modal via TonConnect with coin bonuses, and a referral system rewarding invites and purchases.

**Architecture:** 
- Backend: SQLite via Prisma schema updates (User referral relations, phone verification, TonDeposit model). Telegram Bot (`server/bot.js`) handles `request_contact` and referral start links. API routes handle auth validation, referral listing, and TON transaction crediting with referral kickbacks.
- Frontend: TonConnect UI provider wraps the Next.js app. The Header coin capsule opens `TonPurchaseModal` featuring packages with bonus multipliers, native Telegram haptics, wallet connection, on-chain transaction initiation, and a dedicated referral link sharing view.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM (SQLite), `@tonconnect/ui-react`, `@telegram-apps/sdk`.

**Spec:** `docs/superpowers/specs/2026-10-22-telegram-phone-ton-purchase-design.md`

## Global Constraints
- Theme: Cosmic Arcade (dark background `#181a20`, gold/amber accents `#facc15`, space gray `#1f2937`).
- Language: Complete Persian (FA) UI with RTL layout and Persian digits/currency labels where appropriate.
- Environments: Seamless compatibility inside Telegram Mini App as well as desktop/browser Dev mode.
- Conversion rate: 1 TON = 1,000 base game coins + tiered bonus multipliers.
- Referral rewards: 250 coins on verified phone signup + 10% coin bonus from referred user TON deposits.

## Review Focus
1. User opens Mini App directly without verifying phone in bot -> App must show polite phone verification guard with one-click bot redirect, or dev mode bypass in browser.
2. TonConnect transaction fails or is rejected in wallet -> App must gracefully display Persian error notification without decrementing or altering local state.
3. User already shared phone previously -> Bot /start must not prompt repeatedly, immediately offering game launch.
4. Referral loop self-referral prevention -> User cannot refer themselves via their own referral link.
5. Deposit replay prevention -> TON transaction hash/boc must be unique in database to prevent double-crediting.

---

### Task 1: Database Schema & Prisma Updates for Phone, Referrals & TON Deposits

**Files:**
- Modify: `prisma/schema.prisma`
- Output: `prisma/dev.db`, `node_modules/.prisma/client`

**Interfaces:**
- Produces: Updated `User` model with `phone`, `phoneVerified`, `referrerId`, `referredUsers`, `referralCoinsEarned`, and `TonDeposit` model.

- [ ] **Step 1: Update `prisma/schema.prisma` with User fields and TonDeposit model**
Add `referrerId`, `referrer`, `referredUsers`, `referralEarnings`, and `TonDeposit` table.

- [ ] **Step 2: Generate and apply Prisma migrations to SQLite**
Run: `npx prisma generate && npx prisma db push`
Expected: Success with updated Prisma client and schema in sync with SQLite.

- [ ] **Step 3: Verify schema using test query script**
Write and run small node script checking `prisma.user` and `prisma.tonDeposit` fields.

---

### Task 2: Telegram Bot Phone Verification & Referral Linking

**Files:**
- Modify: `server/bot.js`

**Interfaces:**
- Consumes: Telegram Bot API updates (`message`, `contact`, `callback_query`).
- Produces: Contact verification flow with `request_contact: true` reply keyboard; Referral detection from `/start ref_<telegramId>`; Database updates with 250 bonus coins to referrer on contact sharing.

- [ ] **Step 1: Add referral parsing to `/start` command**
Parse `ref_<referrerTelegramId>` from `/start` payload, verify not self-referral, and link `referrerId` on user creation/upsert.

- [ ] **Step 2: Add phone verification check in `/start`**
If user has not verified phone (`phoneVerified === false`), reply with Persian explanation and `reply_markup` requesting phone contact.

- [ ] **Step 3: Handle `message.contact` update in bot polling loop**
When user sends contact, verify `contact.user_id === message.from.id`, update `User.phone` and `User.phoneVerified = true`. Credit 250 coins to referrer (if exists) and notify referrer. Send welcome message with WebApp launch button.

- [ ] **Step 4: Verify bot logic**
Run bot in dry-run/mock mode and verify contact handling and referral reward execution.

---

### Task 3: Auth API & Frontend Phone Verification Guard

**Files:**
- Modify: `app/api/auth/telegram/route.ts`
- Modify: `components/AuthProvider.tsx`
- Create: `components/PhoneVerificationGuard.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/telegram` with `tma <initData>`
- Produces: User object containing `phone`, `phoneVerified`, `telegramId`.
- Guard UI: Blocks access to game if `phoneVerified === false`, providing a button to launch bot and share phone (plus test input for Dev mode).

- [ ] **Step 1: Update `/api/auth/telegram` to include phone & verification state in response**
Include `phone`, `phoneVerified`, and referral stats in JSON output.

- [ ] **Step 2: Create `components/PhoneVerificationGuard.tsx`**
Build Cosmic Arcade styled guard screen in Persian with Telegram bot link and dev mode test button.

- [ ] **Step 3: Update `components/AuthProvider.tsx` to display PhoneVerificationGuard when unverified**
Display guard if user is loaded and `!user.phoneVerified`.

---

### Task 4: TonConnect Provider Setup in Next.js Root Layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/TonConnectRootProvider.tsx`

**Interfaces:**
- Consumes: `@tonconnect/ui-react`, `public/tonconnect-manifest.json`
- Produces: React context for `useTonConnectUI`, `useTonWallet`, and TonConnect modal.

- [ ] **Step 1: Create client wrapper `components/TonConnectRootProvider.tsx`**
Wrap children with `TonConnectUIProvider` configured with manifestUrl and dark theme colors matching Cosmic Arcade.

- [ ] **Step 2: Integrate `TonConnectRootProvider` in `app/layout.tsx`**
Mount inside `RootLayout` so all pages and modals have access to TON wallet state.

---

### Task 5: Clickable Header Coin & TON Purchase / Referral Modal

**Files:**
- Modify: `components/crash/Header.tsx`
- Create: `components/crash/TonPurchaseModal.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `balance`, `user` from `useStore()`, TonConnect wallet hooks.
- Produces: Click handler on Header coin capsule; Modal with "خرید سکه (TON)" and "دعوت از دوستان (ریفرال)" tabs.

- [ ] **Step 1: Make coin capsule clickable in `components/crash/Header.tsx`**
Add interactive hover, cursor-pointer, gold glow, and call `onBalanceClick` when clicked.

- [ ] **Step 2: Create `components/crash/TonPurchaseModal.tsx`**
- Tab 1: Buy Coins:
  - `<TonConnectButton />` UI integration.
  - Package selection: 0.5 TON (500 coins), 1 TON (1,100 coins, +10% bonus), 2 TON (2,500 coins, +25% bonus).
  - Custom amount input with automatic coin calculator.
  - Buy action triggering `tonConnectUI.sendTransaction` and calling backend deposit endpoint on completion.
  - Haptic feedback with `@telegram-apps/sdk` or `lib/telegramHaptics`.
- Tab 2: Referrals:
  - Copyable referral link (`https://t.me/<bot>?start=ref_<telegramId>`).
  - Telegram direct share button (`t.me/share/url`).
  - Stats display: number of invited friends and coins earned.

- [ ] **Step 3: Connect modal state in `app/page.tsx`**
Pass `onBalanceClick={() => setIsPurchaseModalOpen(true)}` to `Header` and render `TonPurchaseModal`.

---

### Task 6: TON Deposit API Endpoint & Referral Kickback Calculation

**Files:**
- Create: `app/api/wallet/ton/deposit/route.ts`
- Create: `app/api/profile/referrals/route.ts`

**Interfaces:**
- Consumes: `POST /api/wallet/ton/deposit` with `{ telegramId, amountTon, boc, txHash }`
- Produces: Database transaction incrementing user balance, recording `TonDeposit`, and crediting 10% bonus coins to `referrer` (if any).

- [ ] **Step 1: Implement `POST /api/wallet/ton/deposit`**
Validate request, check for duplicate txHash, calculate coins (including bonus percentage), perform atomic Prisma transaction for user balance + 10% referral commission, and return updated balance.

- [ ] **Step 2: Implement `GET /api/profile/referrals`**
Fetch count of referred users and total coins earned from referrals for the current user.

---

### Task 7: End-to-End Testing & Verification

- [ ] **Step 1: Test Dev mode phone verification guard and bypass**
- [ ] **Step 2: Test clicking Header coin capsule and opening TonPurchaseModal**
- [ ] **Step 3: Test package calculation, wallet connect button display, and simulated/live deposit crediting**
- [ ] **Step 4: Test referral link generation, copying, and share link**
- [ ] **Step 5: Run Next.js build (`npm run build`) to ensure 0 TypeScript or linting errors**
