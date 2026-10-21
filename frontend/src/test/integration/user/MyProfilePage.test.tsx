import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { authenticatedRender } from '../../helpers/authenticatedRender';
import { server } from '../../server';
import { seededStudent } from '../../helpers/fixtures/users';
import { APP_ROUTES } from '../../../config/constants';

describe('MyProfilePage (§5.9)', () => {
  it('when a student visits /profile then the info card renders their fields and no Email form input exists until Edit', async () => {
    server.use(
      http.get('/api/Account/Me', () => HttpResponse.json(seededStudent))
    );

    authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.PROFILE] });

    expect(await screen.findByRole('heading', { name: /My Profile/i })).toBeInTheDocument();
    // No email INPUT yet (card shows email as text; input appears only in the modal).
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
  });

  it('when the Edit profile button is clicked then the Edit Profile modal opens with scope=self (no Email input for Student)', async () => {
    server.use(
      http.get('/api/Account/Me', () => HttpResponse.json(seededStudent))
    );

    const { user } = authenticatedRender({ as: 'student', initialEntries: [APP_ROUTES.PROFILE] });

    const editBtn = await screen.findByRole('button', { name: /edit profile/i });
    await user.click(editBtn);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^email$/i)).toBeNull();
  });
});
