# Bingo App Project Plan

## Current Scope Note

- Frontend backoffice pages and frontend OAuth/Keycloak integration are intentionally removed for now.
- Current app scope relies on backend/bootstrap seeding for wordlist data.
- Backoffice and OAuth may be added back later, but they are out of scope for the current implementation phase.
- Primary gameplay scope is now hosted multiplayer rather than standalone single-player card generation.
- A host creates a game from a seeded wordlist, players join from a QR code, all players stay synced from the backend, and the game ends as soon as one player achieves bingo.

## Multiplayer Direction

- Use the backend as the source of truth for game state, player roster, stamped cells, and game outcome.
- Persist games in SQLite via TypeORM so reconnects and server restarts can recover active and completed games.
- Use HTTP push via Server-Sent Events for live updates from the backend to all connected players.
- Store each player's chosen display name in browser local storage and prefill it on future joins.
- Keep wordlists seeded from the backend; no browser-based wordlist management is required for this gameplay flow.

## Milestones

### 1. Project Scaffolding & Documentation

**Status:** Complete

- [x] Create `agents.md` with TDD/best practices mandates
- [ ] Write `plan.md` (this file) with milestones
- [ ] Write `README.md` with dev/prod setup instructions
- [ ] Initialize NestJS backend (`nest new backend`)
- [ ] Initialize Angular 22 frontend (`ng new frontend --standalone --routing`)
- [ ] Configure TypeScript strict mode, ESLint, Prettier

---

### 2. Backend Core Features (NestJS)

**Status:** In Progress

- [ ] Install dependencies: `@nestjs/typeorm typeorm sqlite3 class-validator class-transformer @nestjs/serve-static @nestjs/keycloak-connect keycloak-connect`
- [ ] Setup SQLite database with TypeORM (`app.module.ts`)
- [ ] **Wordlists Module** (TDD):
  - [ ] `Wordlist` entity (`id`, `name`, `description`, `createdAt`)
  - [ ] `Word` entity (`id`, `text`, `wordlistId`)
  - [ ] DTOs: `CreateWordlistDto`, `UpdateWordlistDto`, `AddWordDto`
  - [ ] `WordlistsService` with CRUD operations
  - [ ] `WordlistsController` with endpoints:
    - `GET /api/wordlists` (list)
    - `GET /api/wordlists/:id` (get with words)
    - `POST /api/wordlists` (create, Keycloak-protected)
    - `PUT /api/wordlists/:id` (update, Keycloak-protected)
    - `DELETE /api/wordlists/:id` (delete, Keycloak-protected)
    - `POST /api/wordlists/:id/words` (add word, Keycloak-protected)
    - `DELETE /api/wordlists/:id/words/:wordId` (remove word, Keycloak-protected)
  - [ ] Unit tests for service, e2e tests for controller
- [ ] **Bingo Module** (TDD):
  - [ ] `BingoService` with `generateCard(wordlistId)` method
    - Fisher-Yates shuffle algorithm
    - Returns 5x5 grid (24 words + FREE center)
    - Validates minimum 24 words in wordlist
  - [ ] `BingoController` with `GET /api/bingo/generate?wordlistId=:id` (public)
  - [ ] Unit tests for service, e2e tests for controller
- [ ] **Hosted Games Module** (TDD):
  - [ ] Entities:
    - [ ] `Game` (`id`, `joinCode`, `wordlistId`, `status`, `startedAt`, `endedAt`, `winnerPlayerId`, `createdAt`, `updatedAt`)
    - [ ] `GamePlayer` (`id`, `gameId`, `displayName`, `cardSeed`, `joinedAt`, `connectedAt`, `isHost`)
    - [ ] `GameCardCell` or equivalent persisted stamp state keyed by `playerId`, `row`, `col`, `value`, `isStamped`
  - [ ] DTOs:
    - [ ] `CreateGameDto` (`wordlistId`, `hostName`)
    - [ ] `JoinGameDto` (`displayName`)
    - [ ] `StartGameDto`
    - [ ] `StampCellDto` (`row`, `col`)
  - [ ] `GamesService` responsibilities:
    - [ ] Create a pending game for a selected wordlist
    - [ ] Generate a short join code suitable for QR code URLs
    - [ ] Join a pending game and assign each player a persisted bingo card
    - [ ] Prevent joins after the host starts the game
    - [ ] Toggle stamped cells for a player after game start
    - [ ] Detect bingo server-side using persisted stamp state
    - [ ] End the game immediately when one player wins and persist the winner
    - [ ] Rehydrate current game state for reconnecting clients
  - [ ] `GamesController` endpoints:
    - [ ] `POST /api/games` create hosted game
    - [ ] `GET /api/games/:joinCode` fetch lobby/game snapshot
    - [ ] `POST /api/games/:joinCode/join` join pending game
    - [ ] `POST /api/games/:joinCode/start` host starts game
    - [ ] `POST /api/games/:joinCode/stamps` toggle a player stamp
    - [ ] `GET /api/games/:joinCode/events` Server-Sent Events stream
  - [ ] Unit tests for service rules and controller tests for lobby, join, start, stamp, and win flows
- [ ] **Config Module**:
  - [ ] `GET /api/config` endpoint (returns public Keycloak config for frontend)
  - [ ] Environment configuration with `@nestjs/config` + validation
- [ ] **Static File Serving**:
  - [ ] Configure `@nestjs/serve-static` to serve `public/` folder
  - [ ] SPA fallback: non-API, non-file routes return `index.html`
  - [ ] Exclude `/api/*` and `/public/*` from SPA fallback
- [ ] **Keycloak Integration**:
  - [ ] Setup `@nestjs/keycloak-connect` in `AppModule`
  - [ ] Apply `@KeycloakProtect()` to all `/api/wordlists*` endpoints
  - [ ] Configure `main.ts` with `app.set('trust proxy', true)` for Nginx PM

---

### 3. Frontend Core Features (Angular 22)

**Status:** In Progress

- [ ] Setup environment files (`environment.ts`, `environment.prod.ts`)
- [ ] **Core Module**:
  - [ ] `ConfigService` to fetch `/api/config` on app init
- [ ] **Public Pages** (No auth required):
  - [ ] **Home Component** (`/`):
    - List available wordlists from `GET /api/wordlists`
    - "Host Game" action linking to host setup flow
    - Optional "Join Game" action for manual join code entry
  - [ ] **Host Setup Component** (`/host/:wordlistId`):
    - Require or prefill player name from local storage
    - Create a pending hosted game via `POST /api/games`
    - Render shareable join URL and QR code
    - Show joined player roster in real time until start
    - Allow host to start the game once ready
  - [ ] **Join Component** (`/join/:joinCode`):
    - Prefill player name from local storage
    - Allow player to join a pending game
    - Show lobby state while waiting for host to start
  - [ ] **Game Component** (`/games/:joinCode` or equivalent):
    - Load current game snapshot from backend
    - Display each player's own 5x5 bingo card
    - Toggle stamps through backend API rather than local-only state
    - Subscribe to SSE updates for roster changes, start, stamps, and winner
    - Show winner banner and freeze further interaction when a player gets bingo
    - Mobile-first: full-screen card, large touch targets
  - [ ] **Name Persistence**:
    - Store `playerName` in local storage after first successful host/join
    - Reuse stored name for subsequent sessions with user override support
  - [ ] **QR Join UX**:
    - Generate QR code from the frontend for the join URL
    - Keep the same QR code visible in the lobby until the host starts the game
- [ ] **Deferred Features**:
  - [ ] Reintroduce frontend OAuth/Keycloak integration if backoffice returns
  - [ ] Reintroduce protected backoffice pages if manual wordlist management is needed again
- [ ] **Shared Components**:
  - [ ] Mobile-friendly header/navbar
  - [ ] Loading spinner
  - [ ] Error notification component
- [ ] **Styling**:
  - [ ] Mobile-first CSS (viewport meta, touch targets ≥44px)
  - [ ] Bingo card: CSS Grid 5x5, responsive font sizes
  - [ ] Backoffice: clean table/form layout

---

### 4. Testing & Quality Assurance

**Status:** In Progress

- [ ] **Backend Tests** (Co-located `*.spec.ts`):
  - [ ] Unit tests: Services (wordlists, bingo), guards
  - [ ] E2E tests: Controllers (API endpoints)
  - [ ] Multiplayer service tests:
    - [ ] host creates game and receives join code
    - [ ] player can join while game is pending
    - [ ] join is rejected after game start
    - [ ] unique per-player card generation is persisted
    - [ ] bingo detection ends game and persists winner
    - [ ] further stamps are rejected after game completion
  - [ ] SSE tests or integration coverage for lobby/game update broadcasts
  - [ ] Achieve 80%+ coverage, 100% on critical paths
  - [ ] Run `npm run test:cov` to verify
- [ ] **Frontend Tests** (Co-located `*.spec.ts`, Vitest):
  - [ ] Unit tests: Services (auth, API), guards
  - [ ] Component tests: home, host lobby, join, and game components
  - [ ] Local storage tests for name persistence
  - [ ] SSE client tests for live state updates and cleanup on destroy
  - [ ] Achieve 80%+ coverage
- [ ] **Linting & Formatting**:
  - [ ] Run ESLint, Prettier on all files
  - [ ] Fix all warnings/errors

---

### 5. Hosted Game Delivery Order

**Status:** Pending

- [ ] Phase 1: backend data model and join/start APIs
- [ ] Phase 2: host lobby UI with QR code and player roster
- [ ] Phase 3: player join flow with local-storage-backed name
- [ ] Phase 4: in-game SSE sync and server-authoritative stamp handling
- [ ] Phase 5: winner detection, lock game, and reconnect recovery

---

### 6. Docker & Deployment

**Status:** Pending

- [ ] Create `.dockerignore` (exclude `node_modules`, `.git`, `dist`, `.env`)
- [ ] Create multi-stage `Dockerfile`:
  - **Stage 1**: Build Angular (`node:22-alpine` → `ng build` → output `dist/frontend/browser/`)
  - **Stage 2**: Build NestJS (`node:22-alpine` → `npm run build` → output `dist/`)
  - **Stage 3**: Production (`node:22-alpine` → copy backend build to `/app`, copy Angular build to `/app/public`, install prod deps, expose 3000, start with `node /app/dist/main.js`)
- [ ] Build Docker image locally:
  ```bash
  docker build -t theredhead/bingo-game:latest -t theredhead/bingo-game:v1.0.0 .
  ```
- [ ] Push to Docker Hub:
  ```bash
  docker push theredhead/bingo-game:latest
  docker push theredhead/bingo-game:v1.0.0
  ```
- [ ] Create `.env.example` with all required variables:
  ```
  KEYCLOAK_REALM=...
  KEYCLOAK_AUTH_SERVER_URL=...
  KEYCLOAK_BACKEND_CLIENT_ID=...
  KEYCLOAK_BACKEND_CLIENT_SECRET=...
  KEYCLOAK_FRONTEND_CLIENT_ID=...
  DATABASE_PATH=...
  PORT=3000
  ```

---

### 7. Production Deployment (VPS + Nginx Proxy Manager)

**Status:** Pending

- [ ] Pull image on VPS: `docker pull theredhead/bingo-game:latest`
- [ ] Create `.env` file with real Keycloak credentials
- [ ] Run container with volume for SQLite persistence:
  ```bash
  docker run -d \
    -p 3000:3000 \
    -v $(pwd)/db.sqlite:/app/db.sqlite \
    --env-file .env \
    --name bingo-game \
    --restart unless-stopped \
    theredhead/bingo-game:latest
  ```
- [ ] Configure Nginx Proxy Manager:
  - Create Proxy Host for domain (e.g., `bingo.yourdomain.com`)
  - Forward to: VPS IP + port 3000
  - Enable SSL (Let's Encrypt)
  - Verify proxy headers (X-Forwarded-Proto, X-Forwarded-Host)
- [ ] **Keycloak One-Time Setup**:
  - Create realm (e.g., `bingo-realm`)
  - Create **Frontend Client**: Public, PKCE enabled, redirect URIs: `https://yourdomain.com/backoffice/*`
  - Create **Backend Client**: Confidential, note client secret for `.env`
- [ ] End-to-End Validation:
  - Public access: Home page, card generation (no login)
  - Protected access: Backoffice requires Keycloak login
  - Nginx PM proxy works (HTTPS, no mixed content)

---

## Progress Tracking

- **Total Tasks**: ~60
- **Completed**: ~50 (Backend complete, Frontend 95% complete)
- **Current Phase**: Hosted multiplayer redesign
- **Next Step**: Implement the backend hosted games module and the frontend host/join lobby flow before Docker work

---

## Notes

- Follow TDD: Write tests first (per `agents.md`)
- All code must pass linting and tests before commit
- Update this file as milestones are completed
- Frontend currently assumes seeded data is the source of truth; no browser-based wordlist administration exists at this time.
- Use server-side bingo detection as the authoritative win condition so all clients converge on the same result.
- Prefer Server-Sent Events over polling for live lobby and game updates unless browser/platform constraints force a fallback.
