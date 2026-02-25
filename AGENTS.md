# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

AppLens is an AI-powered SDK platform for automated mobile app testing. See `README.md` for full architecture and API docs.

### Services

| Service | Dir | Port | Start Command |
|---|---|---|---|
| API Server (required) | `server/` | 3002 | `node index.js` |
| React Dashboard (optional) | `dashboard/` | 3000 | `BROWSER=none npm start` |
| Automation Engine (optional) | `automation/` | 3001 | `npm run build && node dist/index.js` |

The API server also serves `dashboard.html` (a static dashboard) at its root on port 3002.

### Running Services

- **API server**: `cd server && node index.js` — uses file-based storage by default (`STORAGE_TYPE=file`). No database required.
- **React dashboard**: `cd dashboard && BROWSER=none PORT=3000 npm start` — connects to `http://localhost:3002` by default (configurable via `REACT_APP_API_URL`).
- **Automation**: Must be built first with `npm run build` (TypeScript), then `node dist/index.js`.

### Lint / Type Checking

- Dashboard: `cd dashboard && npx react-scripts build` (runs ESLint as part of CRA build). No standalone lint script configured.
- Automation: `cd automation && npx tsc --noEmit` for type checking.
- Server: No ESLint configured; plain JavaScript.

### Testing

- E2E test script: `bash test-e2e.sh` (requires API server running on 3002 and static dashboard on 3005; adjust as needed).
- Automation: `cd automation && npm test` (Jest, if tests are added).

### Gotchas

- The server stores screens/elements via the `storage` module (file-based by default at `server/data/`) but sessions/issues/screenshots use an in-memory `memoryStore`. Data in `memoryStore` is lost on server restart.
- Supabase/Redis/Ollama are optional; the server works fully without them. Auth routes require Supabase credentials.
- `start.sh` and `build.sh` have hardcoded paths (`/root/.openclaw/...`); do not use them directly. Use the commands documented above instead.
