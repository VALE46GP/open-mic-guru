import React from 'react';
import { AuthProvider } from '../../context/AuthContext';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateUser from './CreateUser';

describe('CreateUser Component', () => {
    afterEach(() => {
        global.fetch.mockRestore();
    });

    test('displays error message on registration failure', async () => {
        // Set up fetch mock to return a failure
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({ errors: [{ msg: 'Registration failed' }] }), // Mock error format to match component expectations
        });

        render(<CreateUser />);

        fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test User' } });

        await act(async () => {
            fireEvent.click(screen.getByTestId('register-button'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent('Registration failed');
        });
    });

    test('handles registration failure', async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({ errors: [{ msg: 'Registration failed' }] }), // Match component's expected error format
        });

        render(
            <AuthProvider>
                <MemoryRouter>
                    <CreateUser />
                </MemoryRouter>
            </AuthProvider>
        );

        fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test User' } });

        await act(async () => {
            fireEvent.click(screen.getByTestId('register-button'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toBeInTheDocument();
            expect(screen.getByTestId('error-message')).toHaveTextContent('Registration failed');
        });

        global.fetch.mockRestore();
    });

    test('displays success message on registration success', async () => {
        // Set up fetch mock to return a success
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ token: 'sampleToken' }),
        });

        render(<CreateUser />);

        fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test User' } });

        await act(async () => {
            fireEvent.click(screen.getByTestId('register-button'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('success-message')).toBeInTheDocument();
        });
    });

    test('handles input changes', () => {
        render(
            <AuthProvider>
                <MemoryRouter>
                    <CreateUser />
                </MemoryRouter>
            </AuthProvider>
        );

        fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test User' } });

        expect(screen.getByTestId('email-input')).toHaveValue('test@example.com');
        expect(screen.getByTestId('password-input')).toHaveValue('password123');
        expect(screen.getByTestId('name-input')).toHaveValue('Test User');
    });

    test('submits the form and handles success', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYifQ.signature' })
            });

        render(
            <AuthProvider>
                <MemoryRouter>
                    <CreateUser />
                </MemoryRouter>
            </AuthProvider>
        );

        fireEvent.change(screen.getByTestId('email-input'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByTestId('password-input'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Test User' } });

        await act(async () => {
            fireEvent.click(screen.getByTestId('register-button'));
        });

        await waitFor(() => {
            expect(screen.getByTestId('success-message')).toBeInTheDocument();
        });

        global.fetch.mockRestore();
    });
});
