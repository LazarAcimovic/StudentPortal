import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { API_ROUTES } from '../config/constants';

const cookieHeaders = (access: string, refresh: string): Headers => {
  const h = new Headers();
  h.append('Set-Cookie', `sp_access=${access}; HttpOnly; SameSite=Strict; Path=/`);
  h.append('Set-Cookie', `sp_refresh=${refresh}; HttpOnly; SameSite=Strict; Path=/`);
  return h;
};

export const handlers = [
  http.post(`/api${API_ROUTES.ACCOUNT_LOGIN}`, () =>
    HttpResponse.json(
      { id: 1, firstName: 'Test', lastName: 'User', email: 'test@example.com', userRole: 2 },
      { headers: cookieHeaders('test_access', 'test_refresh') }
    )
  ),

  http.post(`/api${API_ROUTES.ACCOUNT_REFRESH}`, () =>
    new HttpResponse(null, {
      status: 204,
      headers: cookieHeaders('new_access', 'new_refresh'),
    })
  ),

  http.post(`/api${API_ROUTES.ACCOUNT_LOGOUT}`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.get(`/api${API_ROUTES.ACCOUNT_ME}`, () =>
    HttpResponse.json({
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      userRole: 2,
    })
  ),
];

export const server = setupServer(...handlers);
