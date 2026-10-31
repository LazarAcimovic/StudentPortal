import { http, HttpResponse, type HttpHandler } from 'msw';

export const API_PREFIX = '/api';

// The exact body type HttpResponse.json accepts; fixtures are loosely typed, so
// the handlers below cast their payload to it.
type JsonInput = Parameters<typeof HttpResponse.json>[0];

export function apiUrl(path: string): string {
  return `${API_PREFIX}${path}`;
}

export function problemJson(status: number, message = 'error') {
  return HttpResponse.json({ title: 'An error occurred.', message }, { status });
}
import { API_ROUTES } from '../../../config/constants';
import { seededStudent } from '../fixtures/users';
import type { User as StoreUser } from '../../../shared/models/User';

const cookieHeaders = (access: string, refresh: string): Headers => {
  const h = new Headers();
  h.append('Set-Cookie', `sp_access=${access}; HttpOnly; SameSite=Strict; Path=/`);
  h.append('Set-Cookie', `sp_refresh=${refresh}; HttpOnly; SameSite=Strict; Path=/`);
  return h;
};

export function meHandler(user: StoreUser | null): HttpHandler {
  return http.get(`/api${API_ROUTES.ACCOUNT_ME}`, () => {
    if (!user) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(user);
  });
}

export function loginHandler(user: StoreUser | null, status = 200): HttpHandler {
  return http.post(`/api${API_ROUTES.ACCOUNT_LOGIN}`, () => {
    if (status !== 200 || !user) return new HttpResponse(null, { status });
    return HttpResponse.json(user, {
      headers: cookieHeaders('acc', 'ref'),
    });
  });
}

export function logoutHandler(): HttpHandler {
  return http.post(`/api${API_ROUTES.ACCOUNT_LOGOUT}`, () =>
    new HttpResponse(null, { status: 204 })
  );
}

export function refreshHandler(status: 204 | 401 = 204): HttpHandler {
  return http.post(`/api${API_ROUTES.ACCOUNT_REFRESH}`, () => {
    if (status === 204) {
      return new HttpResponse(null, { status: 204, headers: cookieHeaders('a2', 'r2') });
    }
    return new HttpResponse(null, { status: 401 });
  });
}

export function studentDashboardHandler(payload: unknown): HttpHandler {
  return http.get(`/api${API_ROUTES.STUDENT_ME_DASHBOARD}`, () =>
    HttpResponse.json(payload as JsonInput)
  );
}

export function professorDashboardHandler(payload: unknown): HttpHandler {
  return http.get(`/api${API_ROUTES.PROFESSOR_ME_DASHBOARD}`, () =>
    HttpResponse.json(payload as JsonInput)
  );
}

export function professorStudentsHandler(subjectId: string, payload: unknown): HttpHandler {
  return http.get(`/api${API_ROUTES.PROFESSOR_SUBJECT_STUDENTS}/${subjectId}/students`, () =>
    HttpResponse.json(payload as JsonInput)
  );
}

export function escalationCasesHandler(payload: unknown): HttpHandler {
  return http.get(`/api${API_ROUTES.ESCALATION}`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 15);
    const p = payload as { items: unknown[]; page?: number; pageSize?: number; totalCount: number };
    return HttpResponse.json({ items: p.items, page: p.page ?? page, pageSize: p.pageSize ?? pageSize, totalCount: p.totalCount } as JsonInput);
  });
}

export function eligibleProfessorsHandler(payload: unknown): HttpHandler {
  return http.get(`/api${API_ROUTES.ESCALATION_ELIGIBLE_PROFESSORS}`, () =>
    HttpResponse.json(payload as JsonInput)
  );
}

export function pagedUsersHandler(payload: {
  items: unknown[];
  totalCount: number;
  page?: number;
  pageSize?: number;
}): HttpHandler {
  return http.get(`/api${API_ROUTES.USER}`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 15);
    return HttpResponse.json({
      items: payload.items,
      page: payload.page ?? page,
      pageSize: payload.pageSize ?? pageSize,
      totalCount: payload.totalCount,
    } as JsonInput);
  });
}

export function pagedSubjectsHandler(payload: {
  items: unknown[];
  totalCount: number;
  page?: number;
  pageSize?: number;
}): HttpHandler {
  return http.get(`/api${API_ROUTES.SUBJECT}`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 15);
    return HttpResponse.json({
      items: payload.items,
      page: payload.page ?? page,
      pageSize: payload.pageSize ?? pageSize,
      totalCount: payload.totalCount,
    } as JsonInput);
  });
}

export function pagedEnrollmentsHandler(payload: {
  items: unknown[];
  totalCount: number;
  page?: number;
  pageSize?: number;
}): HttpHandler {
  return http.get(`/api${API_ROUTES.ENROLLMENT}`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 15);
    return HttpResponse.json({
      items: payload.items,
      page: payload.page ?? page,
      pageSize: payload.pageSize ?? pageSize,
      totalCount: payload.totalCount,
    } as JsonInput);
  });
}

export function defaultHandlers(user: StoreUser | null = seededStudent): HttpHandler[] {
  return [
    meHandler(user),
    loginHandler(seededStudent),
    logoutHandler(),
    refreshHandler(204),
  ];
}
