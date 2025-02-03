import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import LoginPage from './LoginPage';
import '@testing-library/jest-dom';

// Mock useAuth hook
jest.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        login: jest.fn(),
        isAuthenticated: false,
        userName: '',
        getUserId: jest.fn(),
    }),
}));

// TODO: remove these when temporary tests are no longer needed.
jest.mock('../../components/temporary-tests/ApiTest', () => () => <div data-testid="api-test-mock" />);
// jest.mock('../../components/temporary-tests/UrlTest', () => () => <div data-testid="api-test-mock" />);

const renderWithProviders = (component) => {
    return render(
        <MemoryRouter>
            <AuthProvider>
                {component}
            </AuthProvider>
        </MemoryRouter>
    );
};

describe('LoginPage', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation((message) => {
            if (
                message.includes('Error fetching user details') ||
                message.includes('Login error')
            ) {
                return;
            }
            console.error.originalFn?.(message);
        });
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
        console.error.mockRestore();
    });

    test('renders login form', () => {
        renderWithProviders(<LoginPage />);

        expect(screen.getByRole('heading', { name: /login existing user/i })).toBeInTheDocument();
        expect(screen.getByTestId('email-input')).toBeInTheDocument();
        expect(screen.getByTestId('password-input')).toBeInTheDocument();
        expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    test('handles successful login', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'fake-token' }),
        });

        renderWithProviders(<LoginPage />);

        fireEvent.change(screen.getByTestId('email-input'), {
            target: { value: 'test@example.com' },
        });
        fireEvent.change(screen.getByTestId('password-input'), {
            target: { value: 'password123' },
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('success-message')).toBeInTheDocument();
        });
    });

    test('displays error message on login failure', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({ errors: [{ msg: 'Invalid credentials' }] }),
        });

        renderWithProviders(<LoginPage />);

        fireEvent.change(screen.getByTestId('email-input'), {
            target: { value: 'test@example.com' },
        });
        fireEvent.change(screen.getByTestId('password-input'), {
            target: { value: 'wrongpassword' },
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid credentials');
        });
    });

    test('handles input changes', () => {
        renderWithProviders(<LoginPage />);

        const emailInput = screen.getByTestId('email-input');
        const passwordInput = screen.getByTestId('password-input');

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(emailInput).toHaveValue('test@example.com');
        expect(passwordInput).toHaveValue('password123');
    });

    test('validates required fields', async () => {
        renderWithProviders(<LoginPage />);

        await act(async () => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/please fill in all fields/i);
        });
    });

    test('handles network errors', async () => {
        global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

        renderWithProviders(<LoginPage />);

        fireEvent.change(screen.getByTestId('email-input'), {
            target: { value: 'test@example.com' },
        });
        fireEvent.change(screen.getByTestId('password-input'), {
            target: { value: 'password123' },
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId('login-button'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/error occurred/i);
        });
    });
});
