import React from 'react';
import Modal from '../../../../components/ui/Modal';
import type { AppealModalState } from '../../../appeals/models/appealModal';
import { APPEAL_MAX_LENGTH } from '../../constants/student/constants';

interface Props {
  modalState: AppealModalState | null;
  onClose: () => void;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
}

const AppealModal: React.FC<Props> = ({ modalState, onClose, onTextChange, onSubmit }) => {
  const charsLeft = modalState ? APPEAL_MAX_LENGTH - modalState.text.length : 0;

  return (
    <Modal
      open={modalState !== null}
      onClose={onClose}
      title="Write Appeal"
      blurBackdrop
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={modalState?.isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-warning"
            onClick={onSubmit}
            disabled={modalState?.isSubmitting || !modalState?.text.trim()}
          >
            {modalState?.isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              'Submit appeal'
            )}
          </button>
        </>
      }
    >
      {modalState && (
        <>
          {modalState.error && (
            <div className="alert alert-danger py-2">{modalState.error}</div>
          )}
          <label htmlFor="appeal-text" className="form-label">
            Describe your appeal
          </label>
          <textarea
            id="appeal-text"
            className="form-control"
            rows={5}
            maxLength={APPEAL_MAX_LENGTH}
            value={modalState.text}
            onChange={onTextChange}
            disabled={modalState.isSubmitting}
            placeholder="Explain why you are appealing this grade…"
          />
          <div className={`form-text text-end ${charsLeft < 100 ? 'text-warning' : ''}`}>
            {charsLeft} characters remaining
          </div>
        </>
      )}
    </Modal>
  );
};

export default AppealModal;
