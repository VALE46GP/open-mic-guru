import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from './Navigation';
import { useAuth } from '../../hooks/useAuth';

jest.mock('../../hooks/useAuth');

describe('Navigation Component', () => {
    test('renders navigation links correctly when not authenticated', () => {
        useAuth.mockReturnValue({
            getUserId: jest.fn(),
            isAuthenticated: false,
            userName: '',
        });

        render(
            <MemoryRouter>
                <Navigation/>
            </MemoryRouter>
        );

        expect(screen.getByText('Open Mic Guru')).toBeInTheDocument();
        expect(screen.getByText('Test Database')).toBeInTheDocument();
        expect(screen.getByText('Events')).toBeInTheDocument();
        expect(screen.getByText('Create Event')).toBeInTheDocument();
        expect(screen.getByText('Login')).toBeInTheDocument(); // Should show 'Login'
        expect(screen.queryByText('Test User')).not.toBeInTheDocument();
    });

    test('renders user link when authenticated', () => {
        useAuth.mockReturnValue({
            getUserId: () => '123',
            isAuthenticated: true,
            userName: 'Test User',
        });

        render(
            <MemoryRouter>
                <Navigation/>
            </MemoryRouter>
        );

        expect(screen.getByText('Open Mic Guru')).toBeInTheDocument();
        expect(screen.getByText('Test Database')).toBeInTheDocument();
        expect(screen.getByText('Events')).toBeInTheDocument();
        expect(screen.getByText('Create Event')).toBeInTheDocument();
        expect(screen.queryByText('Login')).not.toBeInTheDocument(); // Login should not appear
        expect(screen.getByText('Test User')).toBeInTheDocument();   // User name should appear
    });
});
