import React, { useEffect, useRef, useState } from 'react';
import type { FormValues, GradePanelProps } from '../../models/professor/gradePanel';
import { EMPTY_FORM, FIELDS } from '../../constants/professor/constants';
import { parseField, validateField, computeFinalGrade } from '../../util/gradeUtils';
import { getDraft, saveDraft } from '../../../grades/api/gradeDraftService';
import { professorConfirmGrade, getGradeByEnrollment, type GradeDto } from '../../../grades/api/gradeService';

const GradePanel: React.FC<GradePanelProps> = ({ selectedStudentRow, onGradeChanged }) => {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedGrade, setConfirmedGrade] = useState<GradeDto | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedStudentRow) return;

    setForm(EMPTY_FORM);
    setIsDirty(false);
    setError(null);
    setConfirmedGrade(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const state = selectedStudentRow.gradeState;

    if (state === 'NotGraded' || state === 'Draft') {
      setIsLoading(true);
      getDraft(selectedStudentRow.enrollmentId, controller.signal)
        .then(draft => {
          if (draft) {
            setForm({
              midterm1: draft.midterm1Points != null ? String(draft.midterm1Points) : '',
              midterm2: draft.midterm2Points != null ? String(draft.midterm2Points) : '',
              attendance: draft.attendancePoints != null ? String(draft.attendancePoints) : '',
              practical: draft.practicalPoints != null ? String(draft.practicalPoints) : '',
              exam: draft.examPoints != null ? String(draft.examPoints) : '',
            });
          }
          setIsDirty(false);
        })
        .catch(err => {
          if ((err as { name?: string }).name !== 'CanceledError') {
            setError('Failed to load draft.');
          }
        })
        .finally(() => setIsLoading(false));
    } else if (state === 'Confirmed' || state === 'Finalized') {
      setIsLoading(true);
      getGradeByEnrollment(selectedStudentRow.enrollmentId, controller.signal)
        .then(grade => { setConfirmedGrade(grade); })
        .catch(err => {
          if ((err as { name?: string }).name !== 'CanceledError') {
            setError('Failed to load grade.');
          }
        })
        .finally(() => setIsLoading(false));
    }

    return () => { abortRef.current?.abort(); };
  }, [selectedStudentRow?.enrollmentId, selectedStudentRow?.gradeState, selectedStudentRow]);

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

  const fieldErrors = Object.fromEntries(
    FIELDS.map(f => [f.key, validateField(form[f.key], f.max)])
  ) as Record<keyof FormValues, string | null>;
  const hasFieldErrors = FIELDS.some(f => fieldErrors[f.key] !== null);

  const parsedValues = FIELDS.map(f => parseField(form[f.key]));
  const allFilled = parsedValues.every(v => v !== null) && !hasFieldErrors;
  const sum = allFilled ? parsedValues.reduce((acc, v) => acc! + v!, 0)! : null;
  const finalGrade = sum != null ? computeFinalGrade(sum) : null;

  const canEdit =
    selectedStudentRow?.gradeState === 'NotGraded' ||
    selectedStudentRow?.gradeState === 'Draft';

  const isConfirmedOrFinalized =
    selectedStudentRow?.gradeState === 'Confirmed' ||
    selectedStudentRow?.gradeState === 'Finalized';

  const title = selectedStudentRow
    ? `Grade for ${selectedStudentRow.firstName} ${selectedStudentRow.lastName}`
    : 'Grade';

  const FIELD_KEYS: (keyof GradeDto)[] = [
    'midterm1Points',
    'midterm2Points',
    'attendancePoints',
    'practicalPoints',
    'examPoints',
  ];

  return (
    <div className="col-lg-4">
      <div className="card h-100">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">{title}</h5>
        </div>
        <div className="card-body">
          {!selectedStudentRow ? (
            <p className="text-muted mb-0">Select a student to view or enter their grade.</p>
          ) : isLoading ? (
            <div className="text-center py-3">
              <span className="spinner-border spinner-border-sm" role="status" aria-label="Loading" />
            </div>
          ) : isConfirmedOrFinalized ? (
            confirmedGrade ? (
              <>
                {FIELDS.map((field, i) => (
                  <div className="mb-2" key={field.key}>
                    <label className="form-label small mb-1">
                      {field.label}{' '}
                      <span className="text-muted">(max {field.max})</span>
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={confirmedGrade[FIELD_KEYS[i]] as number}
                      disabled
                      readOnly
                    />
                  </div>
                ))}
                <div className="d-flex justify-content-between align-items-center mt-3 mb-1 px-1">
                  <span className="small text-muted">Points scored:</span>
                  <span className="fw-semibold">
                    {(FIELD_KEYS.reduce((acc, k) => acc + (confirmedGrade[k] as number), 0)).toFixed(1)}
                  </span>
                </div>
                <div className="alert alert-secondary py-2 mb-0">
                  <strong>Final grade:</strong> {confirmedGrade.finalGrade}
                </div>
              </>
            ) : (
              error
                ? <div className="alert alert-danger py-2 mb-0">{error}</div>
                : <p className="text-muted mb-0">No grade data.</p>
            )
          ) : !canEdit ? (
            <p className="text-muted mb-0">Grade pending re-confirmation after accepted appeal.</p>
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
                      className={`form-control form-control-sm${fieldErrors[field.key] ? ' is-invalid' : ''}`}
                      min={0}
                      max={field.max}
                      step={0.5}
                      value={form[field.key]}
                      onChange={e => handleChange(field.key, e.target.value)}
                    />
                    {fieldErrors[field.key] && (
                      <div className="invalid-feedback">{fieldErrors[field.key]}</div>
                    )}
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
