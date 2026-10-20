import { HttpResponse } from 'msw';

export const API_PREFIX = '/api';

export function apiUrl(path: string): string {
  return `${API_PREFIX}${path}`;
}

export function problemJson(status: number, message = 'error'): HttpResponse {
  return HttpResponse.json({ title: 'An error occurred.', message }, { status });
}
