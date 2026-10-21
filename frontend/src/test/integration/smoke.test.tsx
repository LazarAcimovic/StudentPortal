import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAnonymously } from '../helpers/authenticatedRender';

describe('Smoke', () => {
  it('mounts the home page via renderAnonymously', async () => {
    renderAnonymously('/');
    expect(
      await screen.findByRole('heading', { name: /Welcome to Student Portal/i })
    ).toBeInTheDocument();
  });
});
