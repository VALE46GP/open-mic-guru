import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateUser from './CreateUser';
import '@testing-library/jest-dom';

// Mock external dependencies
jest.mock('../shared/BorderBox/BorderBox', () => ({ children }) => (
    <div data-testid="border-box">{children}</div>
));
jest.mock('../../assets/icons/delete.svg', () => () => <svg data-testid="delete-icon" />);

function renderWithProviders(component) {
    return render(
        <AuthProvider>
            <MemoryRouter>{component}</MemoryRouter>
        </AuthProvider>
    );
}

function mockFetch(response, isError = false) {
    global.fetch = jest.fn().mockResolvedValue({
        ok: !isError,
        json: jest.fn().mockResolvedValue(response),
    });
}

function fillForm({ email, password, name }) {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
}

describe('CreateUser Component', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
        global.fetch.mockRestore();
    });

    test('displays error message on registration failure', async () => {
        mockFetch({ errors: [{ msg: 'Registration failed' }] }, true);

        renderWithProviders(<CreateUser />);

        fillForm({ email: 'test@example.com', password: 'password123', name: 'Test User' });

        await act(async () => {
            fireEvent.click(screen.getByText('Register'));
        });

        await waitFor(() => {
            expect(screen.getByText((content, element) => content.includes('Failed to update'))).toBeInTheDocument();
        });
    });

    test('displays success message on registration success', async () => {
        mockFetch({ token: 'sampleToken' });

        renderWithProviders(<CreateUser />);

        fillForm({ email: 'test@example.com', password: 'password123', name: 'Test User' });

        await act(async () => {
            fireEvent.click(screen.getByText('Register'));
        });

        await waitFor(() => {
            expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
        });
    });

    test('handles input changes', () => {
        renderWithProviders(<CreateUser />);

        fillForm({ email: 'test@example.com', password: 'password123', name: 'Test User' });

        expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
        expect(screen.getByLabelText('Password')).toHaveValue('password123');
        expect(screen.getByLabelText('Name')).toHaveValue('Test User');
    });
});
