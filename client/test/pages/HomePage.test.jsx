import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '../../src/pages/HomePage';

const mutate = vi.fn();

vi.mock('../../src/hooks/mutations/useCreateSession', () => ({
  useCreateSession: () => ({
    mutate,
    isPending: false,
    error: null,
  }),
}));

describe('HomePage', () => {
  test('starts session mutation', () => {
    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start Sharing' }));

    expect(mutate).toHaveBeenCalled();
  });
});
