import { useState } from 'react';
import type { ScenarioPanelProps } from '../../models/professor/professorDashboard';
import { professorReconfirmExam } from '../../../grades/api/gradeService';

function ScenarioAPanel({
  assignedCase,
  onSuccess,
  onError,
}: ScenarioPanelProps) {
  const [exam, setExam] = useState(String(assignedCase.examPoints));
  const [isConfirming, setIsConfirming] = useState(false);

  const fixedSum =
    assignedCase.midterm1Points +
    assignedCase.midterm2Points +
    assignedCase.attendancePoints +
    assignedCase.practicalPoints;

  const examVal = parseFloat(exam);
  const isValid = !isNaN(examVal) && examVal >= 0 && examVal <= 30;

  const total = isValid ? fixedSum + examVal : null;
  const liveGrade = total === null ? null
    : total <= 50 ? 5
    : total <= 60 ? 6
    : total <= 70 ? 7
    : total <= 80 ? 8
    : total <= 90 ? 9
    : 10;

  const handleConfirm = async () => {
    if (!isValid) return;
    setIsConfirming(true);
    try {
      await professorReconfirmExam({ enrollmentId: assignedCase.enrollmentId, examPoints: examVal });
      onSuccess();
    } catch {
      onError('Failed to confirm grade. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div>
      <div className="alert alert-secondary py-2 mb-3 small">
        Midterms: {(assignedCase.midterm1Points + assignedCase.midterm2Points).toFixed(1)}/60
        {' • '}
        Attendance: {assignedCase.attendancePoints.toFixed(1)}/5
        {' • '}
        Practical: {assignedCase.practicalPoints.toFixed(1)}/5
      </div>
      <div className="mb-3">
        <label className="form-label small mb-1">
          Exam <span className="text-muted">(max 30)</span>
        </label>
        <input
          type="number"
          className="form-control form-control-sm"
          min={0}
          max={30}
          step={0.5}
          value={exam}
          onChange={e => setExam(e.target.value)}
        />
      </div>
      {liveGrade !== null && (
        <p className="small mb-3">
          Final grade: <strong>{liveGrade}</strong>
        </p>
      )}
      <button
        className="btn btn-success btn-sm"
        onClick={handleConfirm}
        disabled={!isValid || isConfirming}
      >
        {isConfirming ? (
          <><span className="spinner-border spinner-border-sm me-1" role="status" />Confirming…</>
        ) : (
          'Confirm'
        )}
      </button>
    </div>
  );
}

export default ScenarioAPanel;
