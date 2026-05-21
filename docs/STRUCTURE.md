# Frontend layout (post-refactor)

```
frontend/
├── app/                 # Next.js routes only (thin re-exports where noted)
├── features/            # Screen-level UI by domain
│   ├── home/            # `/` tabs; `AuctionListTab` + `hooks/useAuctionList`
│   ├── market/          # Market intelligence + `/market`
│   ├── auction-detail/  # `/auction/[id]` — hooks + AuctionDetailView
│   └── community/       # PostEditor (embedded, not a route)
├── components/          # Global chrome (layout, chat, notifications)
├── lib/
│   ├── client/          # api, runtimeConfig
│   ├── auth/            # authPreferences
│   ├── auction/         # auctionListRestore
│   └── domain/          # marketData, bidIncrement, postCategories, enhancementAllowlist
├── dev/                 # devMode, localDummyData (localhost mocks)
├── hooks/
├── utils/               # legacy re-export shims → prefer lib/* and dev/*
└── docs/
    ├── STRUCTURE.md
    └── REFACTOR_LEGACY_MAP.md
```

See `REFACTOR_LEGACY_MAP.md` for old→new path table and backend API notes.
