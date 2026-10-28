import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.resolve(here, '..');
const stateFile = path.join(e2eDir, '.e2e-state.json');

function log(msg: string) {
  console.log(`[e2e:teardown] ${msg}`);
}

function killTree(pid: number) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try { process.kill(-pid, 'SIGTERM'); } catch { /* group already gone */ }
    try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
  }
}

async function globalTeardown() {
  if (!fs.existsSync(stateFile)) return;

  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as {
    pids: number[];
    dockerStarted: boolean;
  };

  for (const pid of state.pids ?? []) {
    log(`stopping process ${pid}…`);
    killTree(pid);
  }

  if (state.dockerStarted) {
    log('stopping Postgres (docker compose down)…');
    spawnSync('docker', ['compose', '--env-file', '.env.e2e', 'down'], {
      cwd: e2eDir, stdio: 'inherit', shell: process.platform === 'win32',
    });
  }

  fs.rmSync(stateFile, { force: true });
  log('teardown complete.');
}

export default globalTeardown;
