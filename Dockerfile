# ── Stage 1: Build Angular frontend ─────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build
# Output lands in ../backend/public (angular.json outputPath)


# ── Stage 2: Build NestJS backend ────────────────────────────────────────────
FROM node:22-alpine AS backend-build

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
# Copy frontend build output into the right place before compiling
COPY --from=frontend-build /app/backend/public ./public

RUN npm run build


# ── Stage 3: Seed the database ───────────────────────────────────────────────
FROM node:22-alpine AS seeder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-build /app/backend/dist ./dist
COPY backend/wordlists ./wordlists

ENV DATABASE_PATH=/app/db.sqlite
RUN node dist/seed/seed-wordlist.js


# ── Stage 4: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS production

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/db.sqlite

WORKDIR /app

# Only production deps
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Compiled backend + frontend static files
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/public ./public

# Wordlists (available for re-seeding if needed)
COPY backend/wordlists ./wordlists

# Pre-seeded database baked into the image
COPY --from=seeder /app/db.sqlite ./db.sqlite

EXPOSE 3000

CMD ["node", "dist/main.js"]
