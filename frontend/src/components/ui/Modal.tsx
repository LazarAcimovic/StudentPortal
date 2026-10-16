import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: ReactNode;
  size?: ModalSize;
  blurBackdrop?: boolean;
  children: ReactNode;
};

const sizeClass: Record<ModalSize, string> = {
  sm: 'modal-sm',
  md: '',
  lg: 'modal-lg',
};

export default function Modal({
  open,
  onClose,
  title,
  footer,
  size = 'md',
  blurBackdrop = false,
  children,
}: ModalProps) {
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';

    const root = document.getElementById('root');
    if (blurBackdrop && root) {
      root.style.filter = 'blur(8px)';
      root.style.transition = 'filter 0.15s ease';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      if (root) {
        root.style.filter = '';
        root.style.transition = '';
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, blurBackdrop]);

  if (!open) return null;

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <>
      <div
        className="modal show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={onClose}
      >
        <div
          className={`modal-dialog modal-dialog-centered ${sizeClass[size]}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={titleId}>{title}</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>

      <div className="modal-backdrop show" />
    </>,
    modalRoot
  );
}
