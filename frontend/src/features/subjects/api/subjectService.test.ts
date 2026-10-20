import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  getAllSubjects,
  createSubject,
  updateSubject,
} from './subjectService';
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

const subjectRow = {
  id: 42,
  subjectName: 'Programming 1',
  ects: 6,
  professorId: 7,
  professorFirstName: 'Petar',
  professorLastName: 'Petrović',
  isDeleted: false,
};

describe('subjectService.getAllSubjects', () => {
  it('GETs /Subject and returns the array on 200', async () => {
    let called = 0;
    server.use(
      http.get(apiUrl(API_ROUTES.SUBJECT), () => {
        called += 1;
        return HttpResponse.json([subjectRow]);
      })
    );

    const result = await getAllSubjects();

    expect(called).toBe(1);
    expect(result).toEqual([subjectRow]);
  });

  it('returns an empty array when the server returns one', async () => {
    server.use(
      http.get(apiUrl(API_ROUTES.SUBJECT), () => HttpResponse.json([]))
    );
    expect(await getAllSubjects()).toEqual([]);
  });

  it('returns null (and logs) on a server 500', async () => {
    server.use(
      http.get(apiUrl(API_ROUTES.SUBJECT), () =>
        HttpResponse.json({ title: 'boom' }, { status: 500 })
      )
    );

    const result = await getAllSubjects();

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('subjectService.createSubject', () => {
  it('POSTs to /Subject with the camelCase payload the backend expects', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.SUBJECT), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...subjectRow, subjectName: 'Databases', ects: 7, professorId: 3 });
      })
    );

    const result = await createSubject({
      SubjectName: 'Databases',
      ECTS: 7,
      ProfessorId: 3,
    });

    expect(body).toEqual({
      subjectName: 'Databases',
      ects: 7,
      professorId: 3,
    });
    expect(result?.subjectName).toBe('Databases');
    expect(result?.ects).toBe(7);
  });

  it('does NOT send any field other than subjectName/ects/professorId', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(apiUrl(API_ROUTES.SUBJECT), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(subjectRow);
      })
    );

    await createSubject({ SubjectName: 'X', ECTS: 6, ProfessorId: 1 });

    expect(body).not.toBeNull();
    expect(Object.keys(body!).sort()).toEqual(['ects', 'professorId', 'subjectName']);
  });

  it('returns null (and logs) on a 400 validation error', async () => {
    server.use(
      http.post(apiUrl(API_ROUTES.SUBJECT), () =>
        HttpResponse.json({ errors: { SubjectName: ['Required'] } }, { status: 400 })
      )
    );

    const result = await createSubject({ SubjectName: '', ECTS: 6, ProfessorId: 1 });

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('subjectService.updateSubject', () => {
  it('PUTs to /Subject/{id} with the full admin payload (incl. IsDeleted)', async () => {
    let body: unknown = null;
    let seenUrl = '';
    server.use(
      http.put(apiUrl(`${API_ROUTES.SUBJECT}/42`), async ({ request }) => {
        body = await request.json();
        seenUrl = new URL(request.url).pathname;
        return HttpResponse.json({ ...subjectRow, subjectName: 'Renamed' });
      })
    );

    const result = await updateSubject({
      Id: 42,
      SubjectName: 'Renamed',
      ECTS: 8,
      ProfessorId: 7,
      IsDeleted: false,
    });

    expect(seenUrl).toBe('/api/Subject/42');
    expect(body).toEqual({
      id: 42,
      subjectName: 'Renamed',
      ects: 8,
      professorId: 7,
      isDeleted: false,
    });
    expect(result?.subjectName).toBe('Renamed');
  });

  it('supports the soft-delete path (IsDeleted: true) — delete is modeled as an update', async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.put(apiUrl(`${API_ROUTES.SUBJECT}/42`), async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...subjectRow, isDeleted: true });
      })
    );

    const result = await updateSubject({
      Id: 42,
      SubjectName: subjectRow.subjectName,
      ECTS: subjectRow.ects,
      ProfessorId: subjectRow.professorId,
      IsDeleted: true,
    });

    expect((body as Record<string, unknown>).isDeleted).toBe(true);
    expect(result?.isDeleted).toBe(true);
  });

  it('returns null (and logs) on 404 Not Found', async () => {
    server.use(
      http.put(apiUrl(`${API_ROUTES.SUBJECT}/999`), () =>
        new HttpResponse(null, { status: 404 })
      )
    );

    const result = await updateSubject({
      Id: 999,
      SubjectName: 'X',
      ECTS: 6,
      ProfessorId: 1,
      IsDeleted: false,
    });

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it('returns null when the admin lacks permission (403)', async () => {
    server.use(
      http.put(apiUrl(`${API_ROUTES.SUBJECT}/42`), () =>
        new HttpResponse(null, { status: 403 })
      )
    );

    const result = await updateSubject({
      Id: 42,
      SubjectName: 'X',
      ECTS: 6,
      ProfessorId: 1,
      IsDeleted: false,
    });

    expect(result).toBeNull();
  });
});
