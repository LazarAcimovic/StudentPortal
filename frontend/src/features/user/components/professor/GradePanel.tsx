import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfessorStudentRow } from '../../models/professor/professorDashboard';
import { getDraft, saveDraft } from '../../../grades/api/gradeDraftService';
import { professorConfirmGrade } from '../../../grades/api/gradeService';

interface Props {
  selectedStudentRow: ProfessorStudentRow | null;
  onGradeChanged: () => void;
}

interface FormValues {
  midterm1: string;
  midterm2: string;
  attendance: string;
  practical: string;
  exam: string;
}

const EMPTY_FORM: FormValues = {
  midterm1: '',
  midterm2: '',
  attendance: '',
  practical: '',
  exam: '',
};

const FIELDS: { key: keyof FormValues; label: string; max: number }[] = [
  { key: 'midterm1', label: 'First midterm', max: 30 },
  { key: 'midterm2', label: 'Second midterm', max: 30 },
  { key: 'attendance', label: 'Lecture attendance', max: 5 },
  { key: 'practical', label: 'Practical participation', max: 5 },
  { key: 'exam', label: 'Exam', max: 30 },
];

function parseField(value: string): number | null {
  if (value.trim() === '') return null;
  const n = parseFloat(value);
  if (isNaN(n)) return null;
  return n;
}

function computeFinalGrade(sum: number): number {
  if (sum <= 50) return 5;
  if (sum <= 60) return 6;
  if (sum <= 70) return 7;
  if (sum <= 80) return 8;
  if (sum <= 90) return 9;
  return 10;
}

const GradePanel: React.FC<Props> = ({ selectedStudentRow, onGradeChanged }) => {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadDraft = useCallback(async (enrollmentId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoadingDraft(true);
    setError(null);
    try {
      const draft = await getDraft(enrollmentId, controller.signal);
      if (draft) {
        setForm({
          midterm1: draft.midterm1Points != null ? String(draft.midterm1Points) : '',
          midterm2: draft.midterm2Points != null ? String(draft.midterm2Points) : '',
          attendance: draft.attendancePoints != null ? String(draft.attendancePoints) : '',
          practical: draft.practicalPoints != null ? String(draft.practicalPoints) : '',
          exam: draft.examPoints != null ? String(draft.examPoints) : '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setIsDirty(false);
    } catch (err) {
      if ((err as { name?: string }).name !== 'CanceledError') {
        setError('Failed to load draft.');
      }
    } finally {
      setIsLoadingDraft(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedStudentRow) return;
    if (selectedStudentRow.gradeState === 'NotGraded' || selectedStudentRow.gradeState === 'Draft') {
      setForm(EMPTY_FORM);
      setIsDirty(false);
      setError(null);
      loadDraft(selectedStudentRow.enrollmentId);
    } else {
      setForm(EMPTY_FORM);
      setIsDirty(false);
      setError(null);
    }
    return () => { abortRef.current?.abort(); };
  }, [selectedStudentRow?.enrollmentId, selectedStudentRow?.gradeState, loadDraft]);

  const handleChange = (key: keyof FormValues, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setError(null);
  };

  const handleSaveDraft = async () => {
    if (!selectedStudentRow) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveDraft(selectedStudentRow.enrollmentId, {
        midterm1Points: parseField(form.midterm1),
        midterm2Points: parseField(form.midterm2),
        attendancePoints: parseField(form.attendance),
        practicalPoints: parseField(form.practical),
        examPoints: parseField(form.exam),
      });
      setIsDirty(false);
    } catch {
      setError('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedStudentRow) return;
    setIsConfirming(true);
    setError(null);
    try {
      await professorConfirmGrade({
        enrollmentId: selectedStudentRow.enrollmentId,
        midterm1Points: parseField(form.midterm1)!,
        midterm2Points: parseField(form.midterm2)!,
        attendancePoints: parseField(form.attendance)!,
        practicalPoints: parseField(form.practical)!,
        examPoints: parseField(form.exam)!,
      });
      setIsDirty(false);
      onGradeChanged();
    } catch {
      setError('Failed to confirm grade. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  const parsedValues = FIELDS.map(f => parseField(form[f.key]));
  const allFilled = parsedValues.every(v => v !== null);
  const sum = allFilled ? parsedValues.reduce((acc, v) => acc! + v!, 0)! : null;
  const finalGrade = sum != null ? computeFinalGrade(sum) : null;

  const canEdit =
    selectedStudentRow?.gradeState === 'NotGraded' ||
    selectedStudentRow?.gradeState === 'Draft';

  const title = selectedStudentRow
    ? `Grade for ${selectedStudentRow.firstName} ${selectedStudentRow.lastName}`
    : 'Grade';

  return (
    <div className="col-lg-4">
      <div className="card h-100">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">{title}</h5>
        </div>
        <div className="card-body">
          {!selectedStudentRow ? (
            <p className="text-muted mb-0">Select a student to view or enter their grade.</p>
          ) : isLoadingDraft ? (
            <div className="text-center py-3">
              <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading draft" />
            </div>
          ) : !canEdit ? (
            <p className="text-muted mb-0">
              {selectedStudentRow.gradeState === 'Confirmed' || selectedStudentRow.gradeState === 'Finalized'
                ? `Final grade: ${selectedStudentRow.finalGrade ?? '—'}`
                : 'Grade pending re-confirmation after accepted appeal.'}
            </p>
          ) : (
            <>
              {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

              <div className="mb-3">
                {FIELDS.map(field => (
                  <div className="mb-2" key={field.key}>
                    <label className="form-label small mb-1">
                      {field.label}{' '}
                      <span className="text-muted">(max {field.max})</span>
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      min={0}
                      max={field.max}
                      step={0.5}
                      value={form[field.key]}
                      onChange={e => handleChange(field.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {allFilled && sum != null && finalGrade != null && (
                <div className="alert alert-info py-2 mb-3">
                  <strong>Sum:</strong> {sum.toFixed(1)} &nbsp;|&nbsp;
                  <strong>Final grade:</strong> {finalGrade}
                </div>
              )}

              <div className="d-flex gap-2">
                {isDirty && (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleSaveDraft}
                    disabled={isSaving || isConfirming}
                  >
                    {isSaving ? (
                      <><span className="spinner-border spinner-border-sm me-1" role="status" />Saving…</>
                    ) : (
                      'Save draft'
                    )}
                  </button>
                )}
                {allFilled && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={handleConfirm}
                    disabled={isSaving || isConfirming}
                  >
                    {isConfirming ? (
                      <><span className="spinner-border spinner-border-sm me-1" role="status" />Confirming…</>
                    ) : (
                      'Confirm'
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradePanel;
