import React from 'react';
import Modal from '../../../../components/ui/Modal';
import type { ConfirmGradeModalState } from '../../../grades/models/confirmGradeModal';

interface Props {
  modalState: ConfirmGradeModalState | null;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmGradeModal: React.FC<Props> = ({ modalState, onClose, onConfirm }) => (
  <Modal
    open={modalState !== null}
    onClose={onClose}
    title="Confirm grade"
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
          className="btn btn-success"
          onClick={onConfirm}
          disabled={modalState?.isSubmitting}
        >
          {modalState?.isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
              Confirming…
            </>
          ) : (
            'Yes, confirm'
          )}
        </button>
      </>
    }
  >
    <p className="mb-0">Are you sure you want to confirm this grade? This action cannot be undone.</p>
  </Modal>
);

export default ConfirmGradeModal;
