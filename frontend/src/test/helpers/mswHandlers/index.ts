import { http, HttpResponse, type HttpHandler } from 'msw';

export const API_PREFIX = '/api';

export function apiUrl(path: string): string {
  return `${API_PREFIX}${path}`;
}

export function problemJson(status: number, message = 'error'): HttpResponse {
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
    HttpResponse.json(payload)
  );
}

export function professorDashboardHandler(payload: unknown): HttpHandler {
  return http.get(`/api${API_ROUTES.PROFESSOR_ME_DASHBOARD}`, () =>
    HttpResponse.json(payload)
  );
}

export function escalationCasesHandler(payload: unknown): HttpHandler {
  return http.get(`/api${API_ROUTES.ESCALATION}`, () =>
    HttpResponse.json(payload)
  );
}

export function eligibleProfessorsHandler(payload: unknown): HttpHandler {
  return http.get(`/api${API_ROUTES.ESCALATION_ELIGIBLE_PROFESSORS}`, () =>
    HttpResponse.json(payload)
  );
}

export function defaultHandlers(user: StoreUser | null = seededStudent): HttpHandler[] {
  return [
    meHandler(user),
    loginHandler(seededStudent),
    logoutHandler(),
    refreshHandler(204),
  ];
}
