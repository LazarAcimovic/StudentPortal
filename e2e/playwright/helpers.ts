import { request, type APIRequestContext } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'https://localhost:7253';
export const BACKEND_HTTP_URL = process.env.E2E_BACKEND_HTTP_URL ?? 'http://localhost:5012';
export const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5173';
export const TEST_SECRET = process.env.E2E_TEST_SECRET ?? '';

export const PASSWORD = process.env.E2E_PASSWORD ?? 'Password123!';

/** Seeded cast used across journeys (mirrors seed.sql). */
export const USERS = {
  admin: process.env.E2E_ADMIN_EMAIL ?? 'admin@uni.edu',
  professor: process.env.E2E_PROFESSOR_EMAIL ?? 'john.smith@uni.edu',
  student: process.env.E2E_STUDENT_EMAIL ?? 'sarah.williams@student.edu',
} as const;

export type Role = keyof typeof USERS;

/** Saved per-role browser session, written by globalSetup. */
export const STORAGE: Record<Role, string> = {
  admin: path.join(here, '.auth', 'admin.json'),
  professor: path.join(here, '.auth', 'professor.json'),
  student: path.join(here, '.auth', 'student.json'),
};

/**
 * A request context aimed straight at the backend (bypassing the frontend proxy) and
 * carrying the per-build secret header, so it can drive the /api/__test__ control surface.
 */
async function testControlContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BACKEND_URL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { 'X-Test-Secret': TEST_SECRET },
  });
}

/** Truncate + re-seed the test database and re-anchor the e2e clock to wall-clock now. */
export async function resetBackend(): Promise<void> {
  const ctx = await testControlContext();
  try {
    const res = await ctx.post('/api/__test__/reset');
    if (!res.ok()) {
      throw new Error(`resetBackend: POST /api/__test__/reset → ${res.status()} ${await res.text()}`);
    }
  } finally {
    await ctx.dispose();
  }
}

/** Advance the frozen e2e clock by `seconds` and return the backend's new "now". */
export async function advanceClock(seconds: number): Promise<string> {
  const ctx = await testControlContext();
  try {
    const res = await ctx.post(`/api/__test__/advance-clock?seconds=${seconds}`);
    if (!res.ok()) {
      throw new Error(`advanceClock: POST /api/__test__/advance-clock → ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { now: string };
    return body.now;
  } finally {
    await ctx.dispose();
  }
}

export const DAY_SECONDS = 24 * 60 * 60;
