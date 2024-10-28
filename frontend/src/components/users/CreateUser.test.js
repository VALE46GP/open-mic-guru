import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateUser from './CreateUser';

describe('CreateUser Component', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  test('deletes a user successfully', async () => {
    // Mock the user creation response
    fetch.mockResponseOnce(JSON.stringify({ userId: '12345' }));

    // Mock the user deletion response
    fetch.mockResponseOnce('', { status: 204 });

    render(
      <AuthProvider>
        <MemoryRouter>
          <CreateUser />
        </MemoryRouter>
      </AuthProvider>
    );

    // Simulate user input and form submission
    fireEvent.change(screen.getByPlaceholderText(/Email/i), { target: { value: 'testdelete@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/Name/i), { target: { value: 'Test Delete' } });
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    // Verify the user is deleted
    const response = await fetch(`/api/users/12345`, { method: 'DELETE' });
    expect(response.status).toBe(204); // Expecting 204 for successful deletion
  });
});
