# Bingo Game App

[![Docker Hub](https://img.shields.io/docker/pulls/theredhead/bingo-game)](https://hub.docker.com/r/theredhead/bingo-game)

Mobile-first bingo card generator with a Keycloak-protected backoffice for wordlist management. Players get randomized digital bingo cards from custom wordlists and play in real life.

## Prerequisites

### Development
- Node.js v22+ (LTS)
- npm v10+
- Angular CLI v22+ (`npm install -g @angular/cli@22`)
- NestJS CLI (`npm install -g @nestjs/cli`)
- SQLite (included with TypeORM, no separate install)

### Production
- Docker (v24+)
- Nginx Proxy Manager (for SSL/reverse proxy)
- Keycloak instance (v22+ recommended)

---

## Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/bingo-app.git
cd bingo-app
```

### 2. Backend (NestJS) Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your local/dev configuration:
```env
KEYCLOAK_REALM=bingo-realm
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080
KEYCLOAK_BACKEND_CLIENT_ID=backend-client
KEYCLOAK_BACKEND_CLIENT_SECRET=your-backend-secret
KEYCLOAK_FRONTEND_CLIENT_ID=frontend-client
DATABASE_PATH=./db.sqlite
PORT=3000
```

Start development server (with hot reload):
```bash
npm run start:dev
```
Backend runs at `http://localhost:3000`

### 3. Frontend (Angular 22) Setup
Open a new terminal:
```bash
cd frontend
npm install
cp src/environments/environment.example.ts src/environments/environment.ts
```

Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  keycloak: {
    realm: 'bingo-realm',
    authServerUrl: 'http://localhost:8080',
    clientId: 'frontend-client'
  }
};
```

Start development server (with hot reload):
```bash
ng serve
```
Frontend runs at `http://localhost:4200` (proxies API calls to backend via `proxy.conf.json`)

### 4. Keycloak Local Setup (Dev)
1. Run Keycloak locally (Docker):
   ```bash
   docker run -d -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:22.0 start-dev
   ```
2. Access admin console at `http://localhost:8080/admin`
3. Create realm: `bingo-realm`
4. Create clients:
   - **Frontend**: Client ID `frontend-client`, Access Type `public`, enable PKCE, valid redirect URIs: `http://localhost:4200/backoffice/*`
   - **Backend**: Client ID `backend-client`, Access Type `confidential`, note client secret for `.env`

---

## Production Setup (Docker + VPS)

### 1. Pull Image from Docker Hub
```bash
docker pull theredhead/bingo-game:latest
```

### 2. Prepare Environment
Create `.env` file:
```env
KEYCLOAK_REALM=bingo-realm
KEYCLOAK_AUTH_SERVER_URL=https://keycloak.yourdomain.com
KEYCLOAK_BACKEND_CLIENT_ID=backend-client
KEYCLOAK_BACKEND_CLIENT_SECRET=your-production-backend-secret
KEYCLOAK_FRONTEND_CLIENT_ID=frontend-client
DATABASE_PATH=/app/db.sqlite
PORT=3000
```

### 3. Run Container
```bash
docker run -d \
  --name bingo-game \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/db.sqlite:/app/db.sqlite \
  --env-file .env \
  theredhead/bingo-game:latest
```

This:
- Persists SQLite database via volume mount
- Restarts automatically on failure
- Exposes port 3000 for Nginx Proxy Manager

### 4. Nginx Proxy Manager Configuration
1. Access your Nginx Proxy Manager admin panel
2. Add **Proxy Host**:
   - Domain: `bingo.yourdomain.com` (your public domain)
   - Forward Hostname/IP: Your VPS IP
   - Forward Port: 3000
   - Enable **SSL** (Let's Encrypt)
   - Enable **Force SSL**
3. Add custom Nginx configuration (if not auto-applied):
   ```nginx
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-Host $host;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   ```

### 5. Keycloak Production Setup
1. In your production Keycloak instance:
   - Create/update realm `bingo-realm`
   - Update **Frontend Client** redirect URIs: `https://bingo.yourdomain.com/backoffice/*`
   - Update **Backend Client** with production secret (add to `.env`)

---

## Project Structure
```
bingo-app/
├── agents.md          # TDD/best practices for contributors
├── plan.md            # Project milestones and progress
├── README.md          # This file
├── backend/           # NestJS API (serves frontend static files)
├── frontend/          # Angular 22 SPA
├── Dockerfile         # Multi-stage production build
└── .env.example       # Environment variable template
```

## Development Workflow
- Follow TDD: Write tests first (see `agents.md`)
- Use Conventional Commits: `feat:`, `fix:`, `test:`, `refactor:`
- Run linting: `npm run lint` (backend/frontend separately)
- Run tests: `npm run test` (backend), `npm run test` (frontend)

## Troubleshooting
- **Backend won't start**: Check `.env` configuration, ensure SQLite path is writable
- **Frontend can't connect to backend**: Verify proxy config (dev) or relative URLs (prod)
- **Keycloak auth fails**: Check client IDs, secrets, redirect URIs in Keycloak admin console
- **Nginx PM 502 error**: Verify container is running (`docker ps`), port 3000 is exposed

## License
[Add your license here]
