# Agents.md - Development Guidelines

## Core Mandate: Test-Driven Development (TDD)

**All new code must be written using Test-Driven Development practices.**

1. **Red-Green-Refactor Cycle**: Write a failing test first, implement the minimal code to make it pass, then refactor.
2. **Test Coverage**: Minimum 80% code coverage overall. Critical paths (auth, card generation, wordlist CRUD) require 100% coverage.
3. **Co-located Tests**: Test files reside next to their source files (e.g., `bingo.service.ts` + `bingo.service.spec.ts`).
4. **Tests Before Code**: No production code is committed without corresponding passing tests.

---

## NestJS Backend Best Practices

### Module Structure
- Use **feature-based modules** (one module per domain: `WordlistsModule`, `BingoModule`).
- Each feature folder contains: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `dto/`, `entities/`, and `*.spec.ts`.
- Keep `common/` for shared cross-cutting concerns (guards, interceptors, pipes, decorators).

### Controllers
- Keep controllers **thin** – only handle HTTP concerns (validation, response mapping).
- Use **class-validator DTOs** for all incoming request validation.
- Prefix all API routes with `/api/`.

### Services
- Contain all business logic.
- Never access the database directly; use repositories or TypeORM's `Repository` pattern.
- Handle errors gracefully and throw NestJS `HttpException` variants.

### DTOs & Entities
- **Separate DTOs and Entities**. Never expose an entity directly via a controller.
- DTOs live in `dto/` folder, use `class-validator` decorators.
- Entities live in `entities/` folder, use TypeORM decorators.

### Database (TypeORM + SQLite)
- Use **migrations** for schema changes (never alter production DB manually).
- Define entities with explicit column types and constraints.

### Authentication (Keycloak)
- Use `@nestjs/keycloak-connect` for protecting endpoints.
- Protect only `/api/wordlists*` endpoints with `@KeycloakProtect()`.
- Public endpoints: `GET /api/bingo/generate`, `GET /api/config`.

---

## Angular 22 Frontend Best Practices

### Architecture
- **Standalone Components Only**: No NgModules for new code.
- **Signals for State**: Use Angular Signals for local component state.
- **Zoneless Change Detection**: Use `ChangeDetectionStrategy.OnPush` (default in v22).
- **Functional Guards/Interceptors**: Use functional route guards and DI functions.

### Component Structure
- One component per file, co-located unit test (`*.spec.ts`).
- Use `loadComponent` for lazy-loaded routes (no `loadChildren` with modules).
- Keep templates concise; extract complex logic into services or pipes.

### Routing
- SPA routes defined in `app.routes.ts`.
- Use `canActivate` with functional guards (e.g., `authGuard`).
- Backoffice routes (`/backoffice*`) require authentication; game routes (`/`, `/card/*`) are public.

### Styling
- **Mobile-First**: Design for mobile viewports first, then scale up.
- Use CSS Grid for the bingo card (5x5 layout).
- Minimum 44px touch targets for interactive elements.

### Testing
- Use **Vitest** (default in Angular 22) for unit tests.
- Co-locate `*.spec.ts` files with components/services.
- Mock dependencies using Angular's `TestBed` or Vitest mocking.

### API Communication
- Use `provideHttpClient()` with `withFetch()` (or `withXhr()` if upload progress is needed).
- Relative URLs for API calls (e.g., `/api/bingo/generate`).
- Attach `Authorization: Bearer <token>` header for protected backoffice API calls.

---

## General Best Practices

### TypeScript
- **Strict Mode Enabled**: `strict: true` in `tsconfig.json`.
- Explicit types – avoid `any`. Use `unknown` if type is truly unknown.
- Use interfaces for data shapes, classes for entities with methods.

### Code Quality
- **ESLint + Prettier**: Enforce consistent style (no semicolons? spaces? – match project config).
- **Conventional Commits**: Commit messages follow `feat:`, `fix:`, `test:`, `refactor:` prefixes.
- No hardcoded secrets – all sensitive data via environment variables.

### Security
- Validate all user inputs (backend DTOs + frontend forms).
- Sanitize data displayed in templates (Angular does this by default, but be cautious with `innerHTML`).
- Keycloak for backoffice auth; no custom auth implementation.

### Git Workflow
- Feature branches: `feat/wordlists-crud`, `fix/card-generation`.
- Main branch is `main` or `master`.
- PRs require passing tests and lint checks.

---

## TDD Workflow Example (NestJS Service)

```typescript
// 1. RED: Write a failing test first
// bingo.service.spec.ts
describe('BingoService', () => {
  it('should generate a 5x5 card with 24 words + FREE space', () => {
    const service = new BingoService();
    const words = Array.from({ length: 30 }, (_, i) => `Word${i}`);
    const card = service.generateCard(words);
    
    expect(card.length).toBe(5);
    expect(card[2][2]).toBe('FREE'); // Center is FREE
    expect(card.flat().filter(w => w !== 'FREE').length).toBe(24);
  });
});

// 2. GREEN: Implement minimal code to pass
// bingo.service.ts
@Injectable()
export class BingoService {
  generateCard(words: string[]): string[][] {
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 24);
    const grid: string[][] = [];
    let wordIndex = 0;
    for (let row = 0; row < 5; row++) {
      const rowArr: string[] = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) rowArr.push('FREE');
        else rowArr.push(shuffled[wordIndex++]);
      }
      grid.push(rowArr);
    }
    return grid;
  }
}

// 3. REFACTOR: Improve (e.g., use Fisher-Yates shuffle)
```

Follow this cycle for all new code.
