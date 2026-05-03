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


# ── Stage 3: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Only production deps
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Compiled backend
COPY --from=backend-build /app/backend/dist ./dist

# Frontend static files served by NestJS
COPY --from=backend-build /app/backend/public ./public

# Wordlists for seeding
COPY backend/wordlists ./wordlists

EXPOSE 3000

CMD ["node", "dist/main.js"]
