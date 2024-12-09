import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import UsersPage from './UsersPage';
import { renderWithProviders } from '../../testUtils/testUtils';

// Mock UserCard to simplify testing
jest.mock('../../components/users/UserCard', () => {
    return function MockUserCard({ user }) {
        return (
            <div data-testid={`user-card-${user.id}`}>
                <h3>{user.name}</h3>
                <p>{user.email}</p>
            </div>
        );
    };
});

describe('UsersPage', () => {
    const mockUsers = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];

    beforeEach(() => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockUsers)
            })
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders users list', async () => {
        await act(async () => {
            renderWithProviders(<UsersPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
    });

    it('handles search functionality', async () => {
        await act(async () => {
            renderWithProviders(<UsersPage />);
        });

        // Wait for initial render
        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        // Get search input and type
        const searchInput = screen.getByPlaceholderText(/search users/i);
        fireEvent.change(searchInput, { target: { value: 'John' } });

        // Check filtered results
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('handles failed API requests', async () => {
        // Mock failed fetch
        global.fetch = jest.fn(() =>
            Promise.reject(new Error('Failed to fetch'))
        );

        // Spy on console.error
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            renderWithProviders(<UsersPage />);
        });

        // Verify error was logged
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error fetching users:',
            expect.any(Error)
        );

        consoleSpy.mockRestore();
    });

    it('clears search results when search is cleared', async () => {
        await act(async () => {
            renderWithProviders(<UsersPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/search users/i);

        // Search for "John"
        fireEvent.change(searchInput, { target: { value: 'John' } });
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();

        // Clear search
        fireEvent.change(searchInput, { target: { value: '' } });

        // Both users should be visible again
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('handles empty response from API', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            })
        );

        await act(async () => {
            renderWithProviders(<UsersPage />);
        });

        // Should show no users or an empty state
        expect(screen.queryByTestId(/user-card/)).not.toBeInTheDocument();
    });
});
