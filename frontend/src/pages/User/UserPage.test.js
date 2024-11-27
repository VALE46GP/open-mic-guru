import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import UserPage from './UserPage';
import { mockUserResponses, mockEvents } from '../../testData';
import { renderWithProviders } from '../../testUtils/testUtils';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ userId: '123' })
}));

describe('UserPage', () => {
    beforeEach(() => {
        global.fetch = jest.fn((url) => {
            if (url.includes('/api/users/123')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUserResponses.success)
                });
            }
            return Promise.reject(new Error('not found'));
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders user profile and events', async () => {
        await act(async () => renderWithProviders(<UserPage />));

        await waitFor(() => {
            expect(screen.getByText(mockUserResponses.success.user.name)).toBeInTheDocument();
            expect(screen.getByText('Future Event')).toBeInTheDocument();
        });
    });

    test('handles WebSocket updates for events', async () => {
        const { rerender } = renderWithProviders(<UserPage />);
        
        await waitFor(() => {
            expect(screen.getByText('Future Event')).toBeInTheDocument();
        });

        // Simulate WebSocket message
        const wsMessage = {
            type: 'EVENT_UPDATE',
            eventId: 1,
            data: {
                event_name: 'Updated Event Name',
                active: false
            }
        };

        await act(async () => {
            const mockWsMessage = { data: JSON.stringify(wsMessage) };
            window.dispatchEvent(new MessageEvent('message', mockWsMessage));
        });

        await waitFor(() => {
            expect(screen.getByText('Updated Event Name')).toBeInTheDocument();
            expect(screen.getByText('Event Cancelled')).toBeInTheDocument();
        });
    });
});