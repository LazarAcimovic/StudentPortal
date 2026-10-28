import { chromium, type FullConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { STORAGE, USERS, PASSWORD, FRONTEND_URL, BACKEND_URL } from './helpers';

const here = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.resolve(here, '..');
const repoRoot = path.resolve(e2eDir, '..');
const stateFile = path.join(e2eDir, '.e2e-state.json');

loadEnv({ path: path.join(e2eDir, '.env.e2e') });

// Set E2E_MANAGE_SERVERS=false to drive against a stack you started yourself
// (handy while developing); globalSetup then only seeds and logs in.
const manageServers = (process.env.E2E_MANAGE_SERVERS ?? 'true') !== 'false';

const started: { pids: number[]; dockerStarted: boolean } = { pids: [], dockerStarted: false };

function log(msg: string) {
  console.log(`[e2e:setup] ${msg}`);
}

function track(child: ChildProcess) {
  if (child.pid) started.pids.push(child.pid);
}

/** Poll a URL until it answers (any HTTP status = "up"), or time out. */
function waitForServer(url: string, label: string, timeoutMs: number): Promise<void> {
  const client = url.startsWith('https') ? https : http;
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = client.get(url, { rejectUnauthorized: false } as https.RequestOptions, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) reject(new Error(`${label} did not come up at ${url} within ${timeoutMs}ms`));
        else setTimeout(tick, 1000);
      });
      req.setTimeout(3000, () => req.destroy());
    };
    tick();
  });
}

async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(path.dirname(STORAGE.admin), { recursive: true });

  if (manageServers) {
    // 1 ─ Postgres 17 (Docker). --wait blocks until the healthcheck passes.
    log('starting Postgres (docker compose up -d --wait)…');
    const dc = spawnSync('docker', ['compose', '--env-file', '.env.e2e', 'up', '-d', '--wait'], {
      cwd: e2eDir, stdio: 'inherit', shell: process.platform === 'win32',
    });
    if (dc.status !== 0) throw new Error('docker compose up failed — is Docker Desktop running?');
    started.dockerStarted = true;

    // 2 ─ Backend in the e2e environment (controllable clock + /api/__test__ mounted).
    log('starting backend (dotnet run -c Release, ASPNETCORE_ENVIRONMENT=e2e)…');
    const backend = spawn(
      'dotnet',
      ['run', '--project', path.join(repoRoot, 'backend', 'StudentPortal'), '-c', 'Release', '--no-launch-profile'],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        detached: process.platform !== 'win32',
        env: {
          ...process.env,
          ASPNETCORE_ENVIRONMENT: 'e2e',
          ASPNETCORE_URLS: `${BACKEND_URL};${process.env.E2E_BACKEND_HTTP_URL ?? 'http://localhost:5012'}`,
          ConnectionStrings__DefaultConnection: process.env.E2E_BACKEND_CONNECTION!,
          JwtConfig__Key: process.env.E2E_JWT_KEY!,
          JwtConfig__Issuer: process.env.E2E_JWT_ISSUER!,
          JwtConfig__Audience: process.env.E2E_JWT_AUDIENCE!,
          JwtConfig__TokenValidityMins: '15',
          Cors__Origins__0: FRONTEND_URL,
          TestMode__Enabled: 'true',
          TestMode__DatabaseName: process.env.E2E_POSTGRES_DB!,
          TestMode__Secret: process.env.E2E_TEST_SECRET!,
        },
      },
    );
    track(backend);
    await waitForServer(`${BACKEND_URL}/api/Account/Me`, 'backend', 120_000);
    log('backend is up.');

    // 3 ─ Frontend (vite dev; proxies /api → backend per vite.config.ts).
    log('starting frontend (npm run dev)…');
    const frontend = spawn('npm', ['run', 'dev', '--', '--port', '5173', '--strictPort'], {
      cwd: path.join(repoRoot, 'frontend'),
      stdio: 'inherit',
      shell: true,
      detached: process.platform !== 'win32',
    });
    track(frontend);
    await waitForServer(FRONTEND_URL, 'frontend', 60_000);
    log('frontend is up.');
  } else {
    log('E2E_MANAGE_SERVERS=false → assuming Postgres + backend + frontend are already running.');
  }

  fs.writeFileSync(stateFile, JSON.stringify(started, null, 2));

  // 4 ─ Provision the database (migrate + seed + re-anchor the clock).
  log('seeding the test database (POST /api/__test__/reset)…');
  const reset = await fetchJson(`${BACKEND_URL}/api/__test__/reset`, process.env.E2E_TEST_SECRET!);
  if (reset.status < 200 || reset.status >= 300) {
    throw new Error(`reset failed: ${reset.status} ${reset.body}`);
  }

  // 5 ─ Log each role in through the frontend origin and save its storageState.
  log('logging in each role and saving storageState…');
  const channel = process.env.E2E_CHROMIUM_CHANNEL || undefined;
  const browser = await chromium.launch(channel ? { channel } : {});
  try {
    for (const role of ['admin', 'professor', 'student'] as const) {
      const context = await browser.newContext({ baseURL: FRONTEND_URL, ignoreHTTPSErrors: true });
      const res = await context.request.post('/api/Account/Login', {
        data: { email: USERS[role], password: PASSWORD },
      });
      if (!res.ok()) {
        throw new Error(`login as ${role} (${USERS[role]}) failed: ${res.status()} ${await res.text()}`);
      }
      await context.storageState({ path: STORAGE[role] });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  log('setup complete.');
}

/** Minimal POST with the test-secret header, ignoring the dev cert. */
function fetchJson(url: string, secret: string): Promise<{ status: number; body: string }> {
  const client = url.startsWith('https') ? https : http;
  const { hostname, port, pathname, search } = new URL(url);
  return new Promise((resolve, reject) => {
    const req = client.request(
      { hostname, port, path: pathname + search, method: 'POST', rejectUnauthorized: false, headers: { 'X-Test-Secret': secret } },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

export default globalSetup;
