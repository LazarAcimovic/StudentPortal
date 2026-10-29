import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './helpers/renderWithProviders';

describe('smoke', () => {
  it('renderWithProviders mounts a component and jest-dom matchers are live', () => {
    renderWithProviders(<h1>Hello Portal</h1>);
    expect(screen.getByRole('heading', { name: 'Hello Portal' })).toBeInTheDocument();
  });
});
