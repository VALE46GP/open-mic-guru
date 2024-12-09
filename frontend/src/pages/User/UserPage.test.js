import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import UserPage from './UserPage';
import { renderWithProviders } from '../../testUtils/testUtils';
import { mockUserResponses } from '../../testData';

// Mock EventCard since we're getting different markup than expected
jest.mock('../../components/events/EventCard', () => {
    return function MockEventCard({ event }) {
        return (
            <div className="event-card" data-testid={`event-card-${event.event_id}`}>
                <h3>{event.event_name}</h3>
                <p>{event.venue_name}</p>
            </div>
        );
    };
});

describe('UserPage', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockUserResponses)
            })
        );
    });

    afterEach(() => {
        console.error.mockRestore();
        jest.clearAllMocks();
    });

    it('renders user profile', async () => {
        await act(async () => {
            renderWithProviders(<UserPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });
    });

    it('displays loading state initially', () => {
        renderWithProviders(<UserPage />);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('subscribes to WebSocket updates', async () => {
        let mockWebSocketContext;
        await act(async () => {
            const rendered = renderWithProviders(<UserPage />);
            mockWebSocketContext = rendered.mockWebSocketContext;
        });

        expect(mockWebSocketContext.connected).toBe(true);
    });

    it('handles error states', async () => {
        // Mock a failed fetch
        global.fetch = jest.fn(() => Promise.reject(new Error('Failed to fetch')));

        let errorSpy;
        await act(async () => {
            errorSpy = jest.spyOn(console, 'error');
            renderWithProviders(<UserPage />);
            // Wait a bit to allow the error to be caught
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        expect(errorSpy).toHaveBeenCalledWith(
            'Error fetching user data:',
            expect.any(Error)
        );
    });

    it('displays event data on successful load', async () => {
        await act(async () => {
            renderWithProviders(<UserPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Future Event')).toBeInTheDocument();
            expect(screen.getByText('Test Venue')).toBeInTheDocument();
        });
    });
});