# frontend refactor legacy map (machine-readable)

refactor_date: 2026-05-21
deploy_model: frontend and backend are separate deploy units; this doc is for Cursor/agents only.

## path_migration

| old_path | new_path | notes |
|----------|----------|-------|
| `app/page.tsx` (1364 LOC monolith) | `app/page.tsx` (re-export) + `features/home/HomePage.tsx` | home tabs: HOME/COMMUNITY/CALCULATOR/AUCTION |
| `app/post/PostEditor.tsx` | `features/community/PostEditor.tsx` | not a route; embedded in home COMMUNITY tab |
| `app/market/page.tsx` | `features/market/MarketPage.tsx` + thin `app/market/page.tsx` | embedded from home CALCULATOR; `/market` route still works |
| `app/market/CalcTab.tsx` | `features/market/CalcTab.tsx` | |
| `app/market/SearchTab.tsx` | `features/market/SearchTab.tsx` | |
| `app/market/EtcTab.tsx` | `features/market/EtcTab.tsx` | |
| `app/market/AdminTab.tsx` | `features/market/AdminTab.tsx` | |
| `app/market/MarketContext.tsx` | `features/market/MarketContext.tsx` | |
| `app/market/marketData.ts` | `lib/domain/marketData.ts` | shared by sell, market, enhancement allowlist |
| `utils/api.ts` | `lib/client/api.ts` | shim re-export left at `utils/api.ts` |
| `utils/runtimeConfig.ts` | `lib/client/runtimeConfig.ts` | `API_BASE_URL`, `SOCKET_URL` |
| `utils/authPreferences.ts` | `lib/auth/authPreferences.ts` | |
| `utils/devMode.ts` | `dev/devMode.ts` | `isLocalDev()` |
| `utils/localDummyData.ts` | `dev/localDummyData.ts` | local-only mock API |
| `utils/bidIncrement.ts` | `lib/domain/bidIncrement.ts` | mirrors backend bid rules (not shared package) |
| `utils/postCategories.ts` | `lib/domain/postCategories.ts` | |
| `utils/auctionListRestore.ts` | `lib/auction/auctionListRestore.ts` | sessionStorage list restore |
| `lib/enhancementAllowlist.ts` | `lib/domain/enhancementAllowlist.ts` | shim at old path |
| `app/auction/[id]/page.tsx` (~1100 LOC) | `features/auction-detail/*` + thin `page.tsx` re-export | hooks + view split |

## auction_detail_split

| module | path |
|--------|------|
| page shim | `app/auction/[id]/page.tsx` |
| shell | `features/auction-detail/AuctionDetailPage.tsx` |
| view (presentational) | `features/auction-detail/AuctionDetailView.tsx` |
| types/constants | `features/auction-detail/auctionDetailTypes.ts` |
| utils | `features/auction-detail/auctionDetailUtils.ts` (reuses `features/home/auctionListUtils`) |
| orchestrator | `features/auction-detail/hooks/useAuctionDetail.ts` |
| session | `hooks/useAuctionSession.ts` |
| socket + fetch | `hooks/useAuctionSocket.ts` |
| market analysis | `hooks/useAuctionMarketAnalysis.ts` |
| comments | `hooks/useAuctionComments.ts` |
| countdown | `hooks/useAuctionCountdown.ts` |
| actions | `hooks/useAuctionActions.ts` |

## home_feature_split

| module | path |
|--------|------|
| types/constants | `features/home/auctionListTypes.ts` |
| countdown | `features/home/TimeLeft.tsx` |
| hero particles | `features/home/heroParticles.ts` |
| hero CSS-in-JSX | `features/home/HomeGlobalStyles.tsx` |
| auction list UI | `features/home/AuctionListTab.tsx` |
| auction list state | `features/home/hooks/useAuctionList.ts` |
| auction format/helpers | `features/home/auctionListUtils.ts` |
| main shell | `features/home/HomePage.tsx` (~280 LOC; nav + tab shell) |

## import_aliases (preferred)

```
@/lib/client/api
@/lib/client/runtimeConfig
@/lib/auth/authPreferences
@/lib/auction/auctionListRestore
@/lib/domain/{marketData,bidIncrement,postCategories,enhancementAllowlist}
@/dev/{devMode,localDummyData}
@/features/home/HomePage
@/features/market/MarketPage
@/features/community/PostEditor
@/features/auction-detail/AuctionDetailPage
```

## routes_unchanged

| url | file |
|-----|------|
| `/` | `app/page.tsx` -> `features/home/HomePage.tsx` |
| `/market` | `app/market/page.tsx` -> `features/market/MarketPage.tsx` |
| `/auction/[id]` | `app/auction/[id]/page.tsx` -> `features/auction-detail/AuctionDetailPage.tsx` |
| `/sell` | `app/sell/page.tsx` |
| `/mypage` | `app/mypage/page.tsx` |
| `/admin` | `app/admin/page.tsx` |
| `/login` | `app/login/page.tsx` |

## backend_contract_unchanged

- REST: `request("/api/...")` paths unchanged.
- Socket: `SOCKET_URL` from `lib/client/runtimeConfig`; events `place_bid`, `join_room`, `send_message`, `setup_notifications` unchanged.
- Do not assume monorepo shared types with backend; duplicate domain files remain intentional until API codegen.
- Backend refactor map: `backend/docs/REFACTOR_LEGACY_MAP.md`, layout: `backend/docs/STRUCTURE.md` (phase 1: `domain/*`, `requireAdmin`, `routes/index.js`).

## known_followups

- Optional: further split `HomePage` nav into `HomeNav.tsx` if shell grows again.
- `/market` standalone route has no tab bar; use `/?tab=CALCULATOR` or query on `/market?tab=CALC`.
- `utils/*` shims are compatibility stubs; new code should import canonical paths above.

## scripts_added

- `scripts/refactor-home.mjs` — regenerates `HomePage.tsx` from monolith (do not run unless restoring from backup).
- `scripts/restore-utf8-from-maps.mjs` — recover corrupted TSX from `.next/**/*.map` (after bad bulk replace).
- `scripts/restore-market-tabs.mjs` / `restore-market-page.mjs` — restore `features/market/*` from dev source maps.
- `scripts/split-auction-detail-view.mjs` — regenerate `AuctionDetailView.tsx` from legacy page (UTF-8; do not run after manual edits).

## incident_2026-05-21

- Never run PowerShell `Set-Content` / bulk replace on UTF-8 TSX (corrupts Korean).
- If build reports `invalid utf-8`, use `scripts/restore-utf8-from-maps.mjs` then re-apply import paths from this doc.
