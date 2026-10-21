// Pure-UI test (§5.8): Modal mounts without any HTTP.
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { render } from '@testing-library/react';
import Modal from '../../../components/ui/Modal';

function Harness({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open modal</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Thing">
        <input aria-label="Modal input" />
      </Modal>
    </>
  );
}

describe('<Modal> (§5.8)', () => {
  it('when open=false then it does not render', () => {
    render(<Modal open={false} onClose={() => {}} title="T"><div>body</div></Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('when open=true then it renders with role="dialog" and aria-modal="true"', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('when the backdrop (outer dialog area) is clicked then onClose fires', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T"><div>body</div></Modal>
    );
    await user.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('when inside the dialog is clicked then onClose does NOT fire', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T"><div data-testid="inside">body</div></Modal>
    );
    await user.click(screen.getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('when Escape is pressed then onClose fires', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T"><div>body</div></Modal>
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('when close (X) button is clicked then onClose fires', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T"><div>body</div></Modal>
    );
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
