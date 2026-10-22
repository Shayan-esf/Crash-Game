# Graph Report - Crash-Game  (2026-10-22)

## Corpus Check
- 203 files · ~118,907 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 2, .css 2, .ws 1)

## Summary
- 1036 nodes · 1906 edges · 83 communities (46 shown, 37 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Crash Engine & Audio FX
- Admin & Reward Modals
- Frontend Dependencies
- WebSocket Server & Auth
- Interactive UI Dialogs
- Toast Notification System
- Navigation & Table Controls
- Crash Gameplay View
- Sidebar Navigation Components
- Prisma DB & API Routes
- Frontend Dependencies
- Player Profile & Lobby
- Telegram Bot Controller
- Package Scripts & Metadata
- Standalone WebSocket Engine
- Player Profile & Lobby
- Command Palette Dialog
- TypeScript Compiler Configuration
- Shadcn UI Configuration
- Redis PubSub & Stats
- Form & Input Components
- Telemetry Chart Components
- Game Multiplier Engine
- Context Menu Components
- Dropdown Menu Components
- Design System & Rationale
- In-Memory Redis Fallback
- In-Memory Redis Fallback
- Toggle Group Controls
- Web App Manifest
- Test-auth Utilities
- Drawer Slideout Components
- Navigation-menu Utilities
- Select Dropdown Components
- Sheet Overlay Components
- Package Scripts & Metadata
- Route Utilities
- Readme Utilities
- Check-business-connections Utilities
- Sonner Utilities
- Package Scripts & Metadata
- Form Input Controls
- Fake-db Utilities
- TON Blockchain Integration
- Alert Utilities
- Graphic Assets & Sprites
- Resizable Utilities
- Scroll Area Viewports
- Admin & Reward Modals
- Layout Utilities
- TON Blockchain Integration
- TON Blockchain Integration
- Next Utilities
- Postcss Utilities
- Graphic Assets & Sprites
- Tailwind Utilities
- Test-ws Utilities
- Aspect-ratio Utilities
- Collapsible Utilities
- Design System & Rationale
- Docker Infrastructure Services
- TON Blockchain Integration
- TON Blockchain Integration
- UI Component Dependencies
- Pitch Deck & Visuals
- Pitch Deck & Visuals
- Graphic Assets & Sprites
- Graphic Assets & Sprites
- Global Utilities
- Lobby_setup Utilities
- Lobby_setup Utilities
- Lobby_setup Utilities
- Pitch Deck & Visuals
- Pitch Deck & Visuals
- Product Principles & Economy
- Graphic Assets & Sprites
- Graphic Assets & Sprites
- Local Quick Start Config

## God Nodes (most connected - your core abstractions)
1. `cn()` - 228 edges
2. `react` - 84 edges
3. `lucide-react` - 48 edges
4. `next` - 36 edges
5. `useStore` - 33 edges
6. `CrashGameArea()` - 19 edges
7. `prisma` - 19 edges
8. `triggerHaptic()` - 19 edges
9. `compilerOptions` - 17 edges
10. `BlockedUserScreen()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `App Icon Rocket Vector (icon.svg)` --semantically_similar_to--> `Favicon Rocket Vector (favicon.svg)`  [INFERRED] [semantically similar]
  app/icon.svg → public/favicon.svg
- `AlertDialogHeader()` --calls--> `cn()`  [EXTRACTED]
  components/ui/alert-dialog.tsx → lib/utils.ts
- `AlertDialogFooter()` --calls--> `cn()`  [EXTRACTED]
  components/ui/alert-dialog.tsx → lib/utils.ts
- `AlertDialogTitle` --calls--> `cn()`  [EXTRACTED]
  components/ui/alert-dialog.tsx → lib/utils.ts
- `AlertDialogDescription` --calls--> `cn()`  [EXTRACTED]
  components/ui/alert-dialog.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cosmic Arcade Design System Framework** — design_cosmic_arcade, design_tri_state_semantic_rule, design_voltage_rule, design_telemetry_monospace_rule, design_tonal_stratum_rule, design_thumb_zone_anchor [EXTRACTED 1.00]
- **Provably Fair Game Integrity Loop** — readme_provably_fair_protocol, presentation_provably_fair, rubric_security_precedence_rule, readme_weighted_crash_chances [INFERRED 0.85]
- **TON Referral and Phone Verification Pipeline** — docs_superpowers_plans_2026_10_22_telegram_phone_ton_purchase_plan, docs_superpowers_specs_2026_10_22_telegram_phone_ton_purchase_design_spec, docs_superpowers_plans_2026_10_22_telegram_phone_ton_purchase_phone_verification_guard, docs_superpowers_specs_2026_10_22_telegram_phone_ton_purchase_design_referral_reward_system [EXTRACTED 1.00]
- **Crash Game Spacecraft Vector Branding Assets** — app_icon_rocket, public_favicon_rocket, public_sc_spacecraft [INFERRED 0.85]
- **Public UI Placeholder Fallback Assets** — public_placeholder_logo_png, public_placeholder_logo_svg, public_placeholder_user_avatar, public_placeholder_jpg, public_placeholder_svg [INFERRED 0.85]

## Communities (83 total, 37 thin omitted)

### Community 0 - "Crash Engine & Audio FX"
Cohesion: 0.06
Nodes (69): CrashBetControls(), CrashBetControlsProps, CrashGameArea(), Game, GameHistory(), GameHistoryProps, getGameMeta(), FloatingReaction (+61 more)

### Community 1 - "Admin & Reward Modals"
Cohesion: 0.05
Nodes (52): Game, GamesPage(), AdminPage(), Stats, DEFAULT_CHANCES, SettingsPage(), SystemStats, UserDetails (+44 more)

### Community 2 - "Frontend Dependencies"
Cohesion: 0.03
Nodes (62): dependencies, autoprefixer, class-variance-authority, clsx, cmdk, date-fns, dotenv, embla-carousel-react (+54 more)

### Community 3 - "WebSocket Server & Auth"
Cohesion: 0.05
Nodes (32): POST(), prisma, { PrismaClient }, checkHash(), extractUserData(), parseInitData(), validateInitData(), verifyTelegramAuth() (+24 more)

### Community 4 - "Interactive UI Dialogs"
Cohesion: 0.07
Nodes (39): GameButton(), GameButtonProps, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+31 more)

### Community 5 - "Toast Notification System"
Cohesion: 0.08
Nodes (39): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+31 more)

### Community 6 - "Navigation & Table Controls"
Cohesion: 0.08
Nodes (36): AccordionContent, AccordionItem, AccordionTrigger, Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList (+28 more)

### Community 7 - "Crash Gameplay View"
Cohesion: 0.08
Nodes (21): CrashPage(), PhaserCrashGame, GameState, BalanceModal(), BetControls(), BetControlsProps, GameButton(), GameButtonProps (+13 more)

### Community 8 - "Sidebar Navigation Components"
Cohesion: 0.07
Nodes (30): Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+22 more)

### Community 10 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (18): Checkbox, HoverCardContent, PopoverContent, Progress, RadioGroup, RadioGroupItem, Slider, Switch (+10 more)

### Community 11 - "Player Profile & Lobby"
Cohesion: 0.13
Nodes (20): Game, ProfilePage(), UserProfile, Player, PlayerList(), PlayerListProps, BadgeItem, Game (+12 more)

### Community 12 - "Telegram Bot Controller"
Cohesion: 0.21
Nodes (19): ADMIN_IDS, bot, claimDailyBonus(), executeBroadcast(), executeRetargetCampaign(), formatCoins(), formatDate(), handleCallback() (+11 more)

### Community 13 - "Package Scripts & Metadata"
Cohesion: 0.08
Nodes (23): author, name, private, version, autoprefixer, date-fns, dotenv, @hookform/resolvers (+15 more)

### Community 14 - "Standalone WebSocket Engine"
Cohesion: 0.11
Nodes (17): calculateCurrentMultiplier(), cashoutInProgress, { createRedisClient }, crypto, DEFAULT_CRASH_CHANCES, endGame(), generateCrashPoint(), getCrashChances() (+9 more)

### Community 15 - "Player Profile & Lobby"
Cohesion: 0.10
Nodes (3): STAR_PACKAGES, metadata, next

### Community 16 - "Command Palette Dialog"
Cohesion: 0.13
Nodes (17): Command, CommandDialog(), CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator (+9 more)

### Community 17 - "TypeScript Compiler Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 18 - "Shadcn UI Configuration"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 19 - "Redis PubSub & Stats"
Cohesion: 0.15
Nodes (6): chancesFilePath, dataDir, ensureDataDir(), globalForRedis, LocalRedisClient, redis

### Community 20 - "Form & Input Components"
Cohesion: 0.18
Nodes (14): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+6 more)

### Community 21 - "Telemetry Chart Components"
Cohesion: 0.24
Nodes (11): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartStyle(), ChartTooltipContent, getPayloadConfigFromPayload() (+3 more)

### Community 23 - "Context Menu Components"
Cohesion: 0.18
Nodes (10): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+2 more)

### Community 24 - "Dropdown Menu Components"
Cohesion: 0.18
Nodes (10): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+2 more)

### Community 25 - "Design System & Rationale"
Cohesion: 0.18
Nodes (4): The Cosmic Arcade Design Concept, Virtual Credits Economy, Cosmic Crash Game Architecture & Overview, Crash Game Submission Rubric

### Community 26 - "In-Memory Redis Fallback"
Cohesion: 0.18
Nodes (8): chancesFilePath, dataDir, ensureDataDir(), EventEmitter, fs, memoryStore, path, sharedBus

### Community 27 - "In-Memory Redis Fallback"
Cohesion: 0.18
Nodes (3): ioredis, createRedisClient(), MemoryRedis

### Community 28 - "Toggle Group Controls"
Cohesion: 0.29
Nodes (8): ToggleGroup, ToggleGroupContext, ToggleGroupItem, Toggle, toggleVariants, class-variance-authority, @radix-ui/react-toggle, @radix-ui/react-toggle-group

### Community 29 - "Web App Manifest"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 30 - "Test-auth Utilities"
Cohesion: 0.22
Nodes (7): ws, WebSocket, ws, testHistoryAPI(), WebSocket, WebSocket, ws

### Community 31 - "Drawer Slideout Components"
Cohesion: 0.25
Nodes (7): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle, vaul

### Community 32 - "Navigation-menu Utilities"
Cohesion: 0.28
Nodes (8): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport, @radix-ui/react-navigation-menu

### Community 33 - "Select Dropdown Components"
Cohesion: 0.28
Nodes (8): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, @radix-ui/react-select

### Community 34 - "Sheet Overlay Components"
Cohesion: 0.28
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 35 - "Package Scripts & Metadata"
Cohesion: 0.22
Nodes (9): scripts, bot, build, dev, lint, postinstall, start, test-ws (+1 more)

### Community 36 - "Route Utilities"
Cohesion: 0.36
Nodes (7): extractLastStreak(), GET(), pickWinningSlice(), POST(), SLICE_WEIGHTS, STREAK_MULTIPLIERS, WHEEL_SLICES

### Community 37 - "Readme Utilities"
Cohesion: 0.25
Nodes (8): PostgreSQL 15 Container Service, Lobby WebSocket Server ws-server.js, Zero-Dependency SQLite Dev Setup, Exponential Multiplier Formula, Weighted Crash Probability Distribution, GameService Backend Logic, Modular Server Architecture Specification, WebSocketController Connection Manager

### Community 39 - "Sonner Utilities"
Cohesion: 0.29
Nodes (3): ToasterProps, next-themes, sonner

### Community 40 - "Package Scripts & Metadata"
Cohesion: 0.29
Nodes (7): devDependencies, postcss, tailwindcss, @types/node, @types/react, @types/react-dom, typescript

### Community 41 - "Form Input Controls"
Cohesion: 0.33
Nodes (5): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, input-otp

### Community 42 - "Fake-db Utilities"
Cohesion: 0.33
Nodes (5): balances, GameLog, gameLogs, WithdrawRequest, withdrawRequests

### Community 44 - "Alert Utilities"
Cohesion: 0.50
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 46 - "Graphic Assets & Sprites"
Cohesion: 0.50
Nodes (4): App Icon Rocket Vector (icon.svg), Cloud Graphic (cloud.svg), Favicon Rocket Vector (favicon.svg), Spacecraft Silhouette Vector (sc.svg)

### Community 47 - "Resizable Utilities"
Cohesion: 0.50
Nodes (3): ResizableHandle(), ResizablePanelGroup(), react-resizable-panels

### Community 48 - "Scroll Area Viewports"
Cohesion: 0.67
Nodes (3): ScrollArea, ScrollBar, @radix-ui/react-scroll-area

### Community 51 - "TON Blockchain Integration"
Cohesion: 0.67
Nodes (3): PhoneVerificationGuard Implementation Plan, Telegram Phone, TON Purchase & Referral Plan, TON Connection & Phone Verification Design Spec

### Community 55 - "Graphic Assets & Sprites"
Cohesion: 0.67
Nodes (3): Generic Image Placeholder Raster (placeholder.jpg), Generic Image Placeholder Vector (placeholder.svg), Placeholder User Avatar (placeholder-user.jpg)

## Knowledge Gaps
- **355 isolated node(s):** `Game`, `metadata`, `Stats`, `SystemStats`, `DEFAULT_CHANCES` (+350 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 453 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Crash Gameplay View` to `Crash Engine & Audio FX`, `Admin & Reward Modals`, `Interactive UI Dialogs`, `Toast Notification System`, `Navigation & Table Controls`, `Sidebar Navigation Components`, `Frontend Dependencies`, `Player Profile & Lobby`, `Package Scripts & Metadata`, `Command Palette Dialog`, `Form & Input Components`, `Telemetry Chart Components`, `Context Menu Components`, `Dropdown Menu Components`, `Toggle Group Controls`, `Drawer Slideout Components`, `Navigation-menu Utilities`, `Select Dropdown Components`, `Sheet Overlay Components`, `Sonner Utilities`, `Form Input Controls`, `Alert Utilities`, `Scroll Area Viewports`?**
  _High betweenness centrality (0.306) - this node is a cross-community bridge._
- **What connects `Game`, `metadata`, `Stats` to the rest of the system?**
  _355 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Crash Engine & Audio FX` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Player Profile & Lobby` to `Admin & Reward Modals`, `WebSocket Server & Auth`, `Route Utilities`, `Crash Gameplay View`, `Prisma DB & API Routes`, `Package Scripts & Metadata`, `Admin & Reward Modals`, `Layout Utilities`, `Redis PubSub & Stats`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Should `Admin & Reward Modals` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Why does `@prisma/client` connect `WebSocket Server & Auth` to `Prisma DB & API Routes`, `Telegram Bot Controller`, `Package Scripts & Metadata`, `Standalone WebSocket Engine`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.03225806451612903 - nodes in this community are weakly interconnected._