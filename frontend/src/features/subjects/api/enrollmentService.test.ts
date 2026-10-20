import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { getAllEnrollments, createEnrollment } from './enrollmentService';
import { server } from '../../../test/server';
import { apiUrl } from '../../../test/mswOverrides';
import { API_ROUTES } from '../../../config/constants';
import * as navLib from '../../../lib/navigation';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

const enrollmentRow = {
  id: 1,
  studentId: 10,
  studentFirstName: 'Ana',
  studentLastName: 'Anić',
  subjectId: 42,
  subjectName: 'Programming 1',
  enrolledAt: new Date('2026-01-01T00:00:00Z'),
  isDeleted: false,
};

describe('enrollmentService.getAllEnrollments', () => {
  it('GETs /Enrollment and returns the array on 200', async () => {
    let called = 0;
    server.use(
      http.get(apiUrl(API_ROUTES.ENROLLMENT), () => {
        called += 1;
        return HttpResponse.json([enrollmentRow]);
      })
    );

    const result = await getAllEnrollments();

    expect(called).toBe(1);
    expect(result).toHaveLength(1);
    expect(result?.[0].subjectName).toBe('Programming 1');
  });

  it('returns an empty array when the server returns one', async () => {
    server.use(
      http.get(apiUrl(API_ROUTES.ENROLLMENT), () => HttpResponse.json([]))
    );
    expect(await getAllEnrollments()).toEqual([]);
  });

  it('returns null (and logs) on a server 500', async () => {
    server.use(
      http.get(apiUrl(API_ROUTES.ENROLLMENT), () =>
        HttpResponse.json({ title: 'boom' }, { status: 500 })
      )
    );

    const result = await getAllEnrollments();

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('enrollmentService.createEnrollment', () => {
  it('POSTs to /Enrollment with the camelCase payload the backend expects', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.ENROLLMENT), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(enrollmentRow);
      })
    );

    const result = await createEnrollment({ StudentId: 10, SubjectId: 42 });

    expect(body).toEqual({ studentId: 10, subjectId: 42 });
    expect(result?.id).toBe(1);
  });

  it('does NOT send any field other than studentId/subjectId', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(apiUrl(API_ROUTES.ENROLLMENT), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(enrollmentRow);
      })
    );

    await createEnrollment({ StudentId: 10, SubjectId: 42 });

    expect(body).not.toBeNull();
    expect(Object.keys(body!).sort()).toEqual(['studentId', 'subjectId']);
  });

  it('returns null (and logs) on a 400 validation error', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.ENROLLMENT), () =>
        HttpResponse.json({ errors: { StudentId: ['Required'] } }, { status: 400 })
      )
    );

    const result = await createEnrollment({ StudentId: 0, SubjectId: 42 });

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('returns null on 409 Conflict (duplicate enrollment)', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.ENROLLMENT), () =>
        HttpResponse.json({ title: 'duplicate' }, { status: 409 })
      )
    );

    const result = await createEnrollment({ StudentId: 10, SubjectId: 42 });

    expect(result).toBeNull();
  });
});
