import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  professorConfirmGrade,
  professorReconfirmExam,
  studentConfirmGrade,
  getGradeByEnrollment,
} from './gradeService';
import { server } from '../../../test/server';
import { apiUrl } from '../../../test/helpers/mswHandlers';
import { API_ROUTES } from '../../../config/constants';
import * as navLib from '../../../lib/navigation';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(navLib, 'navigate').mockImplementation(() => {});
});

describe('gradeService.studentConfirmGrade', () => {
  it('POSTs { enrollmentId } to /Grade/student-confirm', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.GRADE_STUDENT_CONFIRM), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    await studentConfirmGrade({ enrollmentId: 'enr-1' });
    expect(body).toEqual({ enrollmentId: 'enr-1' });
  });
});

describe('gradeService.professorConfirmGrade', () => {
  it('POSTs the 5 point fields to /Grade/confirm', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.GRADE_CONFIRM), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    const dto = {
      enrollmentId: 'enr-1',
      midterm1Points: 20,
      midterm2Points: 15,
      attendancePoints: 5,
      practicalPoints: 5,
      examPoints: 25,
    };
    await professorConfirmGrade(dto);
    expect(body).toEqual(dto);
  });
});

describe('gradeService.professorReconfirmExam', () => {
  it('POSTs { enrollmentId, examPoints } to /Grade/reconfirm-exam', async () => {
    let body: unknown = null;
    server.use(
      http.post(apiUrl(API_ROUTES.GRADE_RECONFIRM_EXAM), async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      })
    );
    await professorReconfirmExam({ enrollmentId: 'enr-1', examPoints: 28 });
    expect(body).toEqual({ enrollmentId: 'enr-1', examPoints: 28 });
  });
});

describe('gradeService.getGradeByEnrollment', () => {
  it('returns the grade DTO on 200', async () => {
    server.use(
      http.get(apiUrl(`${API_ROUTES.GRADE_BY_ENROLLMENT}/enr-1`), () =>
        HttpResponse.json({
          id: 'g-1',
          enrollmentId: 'enr-1',
          midterm1Points: 10,
          midterm2Points: 10,
          attendancePoints: 5,
          practicalPoints: 5,
          examPoints: 30,
          finalGrade: 8,
          confirmedAt: '2026-01-01T00:00:00Z',
          studentConfirmedAt: null,
          finalizedAt: null,
        })
      )
    );
    const g = await getGradeByEnrollment('enr-1');
    expect(g?.finalGrade).toBe(8);
  });

  it('returns null on 404 (no grade yet)', async () => {
    server.use(
      http.get(apiUrl(`${API_ROUTES.GRADE_BY_ENROLLMENT}/enr-missing`), () =>
        new HttpResponse(null, { status: 404 })
      )
    );
    const g = await getGradeByEnrollment('enr-missing');
    expect(g).toBeNull();
  });
});
