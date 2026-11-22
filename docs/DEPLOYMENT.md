# Deployment guide

CS Quest is two pieces:

| Piece | Where | Why |
|---|---|---|
| **Frontend** - static files from `npm run build` (`dist/`) | **Vercel** | Pure static hosting, no server code |
| **Backend** - FastAPI (`backend/`) | **A Linux VM with Docker** (any VPS: Hetzner, DigitalOcean, EC2, ...) | The C++ sandbox runs Docker containers. Vercel's serverless functions cannot run Docker or keep a SQLite file. |

The browser only ever talks to the Vercel domain. Vercel forwards `/api/*` to the backend (a rewrite), so cookies are first-party
(`SameSite=Lax`, `HttpOnly`) and the CSP can stay `connect-src 'self'`.

```
browser ──https──> Vercel (static app)  ──/api/* rewrite──> https://api.yourdomain.com (Caddy) ──> uvicorn :8000 ──> docker (gcc:13) sandbox
```

> **Do not call the application production-ready until you have done the post-deploy checklist at the end of this file against the real deployment.**

---

## 1. Backend on a Linux VM

Requirements: Ubuntu 22.04+ (or similar), Docker Engine, Python 3.11+, a persistent disk, a DNS name (for HTTPS).

```bash
# one-time
sudo apt-get install -y docker.io python3-venv git caddy
sudo useradd --system --create-home --shell /usr/sbin/nologin csquest
sudo usermod -aG docker csquest             # see the security note below
sudo mkdir -p /var/lib/csquest && sudo chown csquest: /var/lib/csquest

sudo -u csquest git clone <your repo> /opt/csquest
cd /opt/csquest/backend
sudo -u csquest python3 -m venv .venv
sudo -u csquest .venv/bin/pip install -r requirements.txt
sudo docker pull gcc:13-bookworm            # the sandbox image (the API never pulls at request time)
```

Create `/etc/csquest.env` (mode `600`, owner root) - see the table below. Minimum for production:

```
APP_ENV=prod
COOKIE_SECURE=true
DATABASE_PATH=/var/lib/csquest/csquest.db
TRUST_PROXY=1
ANTHROPIC_API_KEY=sk-ant-...          # optional: without it the tutor reports "not configured"
```

`/etc/systemd/system/csquest.service`:

```ini
[Unit]
Description=CS Quest API
After=network.target docker.service
Requires=docker.service

[Service]
User=csquest
WorkingDirectory=/opt/csquest/backend
EnvironmentFile=/etc/csquest.env
# ONE worker: rate limits and the sandbox concurrency cap are per process
ExecStart=/opt/csquest/backend/.venv/bin/uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --workers 1
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

`/etc/caddy/Caddyfile` (automatic HTTPS):

```
api.yourdomain.com {
    reverse_proxy 127.0.0.1:8000
}
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now csquest caddy
curl https://api.yourdomain.com/api/health      # {"status":"ok", "sandbox":{"available":true...}, "tutor":{...}}
```

**Security note - Docker access.** Whoever can talk to the Docker socket is effectively root on the VM. The API needs it to start sandbox
containers. Mitigations: run the API on a dedicated, disposable VM that holds nothing else; keep the VM's firewall closed except 80/443;
consider rootless Docker or gVisor (`--runtime=runsc`) for stronger isolation. Never mount the Docker socket into an internet-facing container.
The sandbox containers themselves run with no network, a read-only filesystem, all capabilities dropped, a non-root user and
memory/CPU/pid/time limits (verified by `backend/tests/test_sandbox.py`).

**Backups.** The whole state is one SQLite file (`DATABASE_PATH`, plus `-wal`/`-shm` while running). Back it up with `sqlite3 csquest.db ".backup out.db"`.

---

## 2. Frontend on Vercel

1. Push the repository to GitHub and import it in Vercel (**Add New -> Project**). Vercel detects Vite
   (build `npm run build`, output `dist`), and `vercel.json` already sets the security headers (CSP, HSTS, X-Frame-Options, ...).
2. **No environment variables are required.** The frontend reads none, except the optional `VITE_API_BASE` (leave unset; see below).
3. After the backend is live, add the API rewrite to `vercel.json` (replace the host) and redeploy:

```json
"rewrites": [{ "source": "/api/:path*", "destination": "https://api.yourdomain.com/api/:path*" }]
```

4. Set `ALLOWED_ORIGINS` on the backend only if the browser will call the API cross-origin (it will not with the rewrite).

Without step 3 the site still works: sign-in, cloud progress, the g++ tab and the AI tutor show "The backend is not reachable" instead of failing silently.

---

## 3. Environment variables

### Backend (process environment only; never commit values)

| Variable | Default | Purpose |
|---|---|---|
| `APP_ENV` | `dev` | `prod` disables `/api/docs` and defaults `COOKIE_SECURE` to true |
| `COOKIE_SECURE` | true in prod | Must be true behind HTTPS |
| `DATABASE_PATH` | `backend/data/csquest.db` | SQLite file (users, sessions, progress). Use a persistent disk |
| `ALLOWED_ORIGINS` | localhost dev origins | Comma-separated origins allowed for credentialed CORS (only needed for cross-origin API use) |
| `TRUST_PROXY` | `0` | `1` when all traffic arrives via Vercel/Caddy: rate limits then use the first `X-Forwarded-For` value. With `0` behind a proxy **all users share one IP and one rate limit** |
| `ANTHROPIC_API_KEY` | unset | Enables the AI tutor. Without it `/api/tutor/ask` answers 503 `tutor_not_configured` |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Model used by the tutor |
| `ANTHROPIC_URL` | Anthropic Messages API | Override only for testing |
| `SANDBOX_ENABLED` | `true` | Set `false` to switch the C++ sandbox off |
| `SANDBOX_IMAGE` | `gcc:13-bookworm` | Image used for every run (must be pulled beforehand) |
| `DOCKER_CMD` | `docker` | e.g. `wsl -d Ubuntu-22.04 -e docker` for Docker inside WSL |
| `MAX_CONCURRENT_RUNS` | `2` | Parallel sandbox containers |
| `SESSION_DAYS` | `14` | Sign-in lifetime |
| `REGISTER_LIMIT_PER_HOUR` | `10` | Sign-ups per client address per hour |

### Frontend (Vercel)

| Variable | Required | Purpose |
|---|---|---|
| *(none)* | - | The app needs no variables on Vercel |
| `VITE_API_BASE` | no | Base URL if the API is served from another origin (not recommended: needs credentialed CORS and `SameSite=None` cookies) |

---

## 4. Post-deploy checklist (run against the real URLs)

- [ ] `GET https://<site>/api/health` through Vercel returns `status: ok` (proves the rewrite).
- [ ] `sandbox.available` is `true`; `tutor.configured` matches whether you set a key.
- [ ] Create an account on the live site; refresh; you are still signed in; cookie is `Secure; HttpOnly`.
- [ ] Solve something, clear site data, sign in again: progress comes back.
- [ ] Open a problem -> **g++ Run** -> run all tests: they pass; try an infinite loop: "Time limit exceeded".
- [ ] Ask the AI tutor a question: an answer arrives (this is the first test against the live Anthropic API).
- [ ] Browser console shows no CSP violations on the dashboard, a problem page, the SQL page and the Interview page.
- [ ] Make 6 wrong logins for one account: the 6th is refused with HTTP 429.
- [ ] `docker ps` on the VM shows no leftover `csq-*` containers after the runs.
