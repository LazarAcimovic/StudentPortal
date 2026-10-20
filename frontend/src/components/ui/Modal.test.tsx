import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test">
        <p>hello</p>
      </Modal>
    );
    expect(container.querySelector('.modal')).toBeNull();
    expect(screen.queryByText('hello')).not.toBeInTheDocument();
  });

  it('renders title and children when open=true', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Hello Title">
        <p>inside</p>
      </Modal>
    );
    expect(screen.getByText('Hello Title')).toBeInTheDocument();
    expect(screen.getByText('inside')).toBeInTheDocument();
  });

  it('fires onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="X">
        <p>c</p>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('fires onClose when the backdrop (outer modal) is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="X">
        <p>c</p>
      </Modal>
    );
    const ue = userEvent.setup();
    // The outer .modal has the onClick handler
    const outer = document.querySelector('.modal') as HTMLElement;
    await ue.click(outer);
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT fire onClose when clicking inside the dialog content', async () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="X">
        <p data-testid="inside">c</p>
      </Modal>
    );
    const ue = userEvent.setup();
    await ue.click(screen.getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders the backdrop with a backdropFilter blur style', () => {
    render(
      <Modal open={true} onClose={() => {}} title="X">
        <p>c</p>
      </Modal>
    );
    const backdrop = document.querySelector('.modal-backdrop') as HTMLElement;
    expect(backdrop).not.toBeNull();
    expect(backdrop.style.backdropFilter).toMatch(/blur/);
  });
});
