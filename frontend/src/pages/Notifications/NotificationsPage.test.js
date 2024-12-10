import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import NotificationsPage from './NotificationsPage';
import { renderWithProviders } from '../../testUtils/testUtils';
import '@testing-library/jest-dom';
import { mockNotification, emptyMockHook, populatedMockHook } from '../../testData/mockNotifications';

// Create mock hook implementation function
const mockHookImplementation = jest.fn();

// Mock EventCard component with proper prop handling
jest.mock('../../components/events/EventCard', () => ({
    __esModule: true,
    default: function MockEventCard({ event }) {
        return (
            <div data-testid={`event-card-${event.event_id}`}>
                <h3>{event.event_name}</h3>
                <p>{event.venue_name}</p>
            </div>
        );
    }
}));

jest.mock('../../context/NotificationsContext', () => ({
    ...jest.requireActual('../../context/NotificationsContext'),
    useNotifications: () => mockHookImplementation()
}));

describe('NotificationsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders empty state when there are no notifications', async () => {
        mockHookImplementation.mockReturnValue(emptyMockHook);
        renderWithProviders(<NotificationsPage />);
        expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    it('renders notifications list', async () => {
        mockHookImplementation.mockReturnValue(populatedMockHook);
        renderWithProviders(<NotificationsPage />);

        await waitFor(() => {
            const eventCard = screen.getByTestId('event-card-123');
            expect(eventCard).toBeInTheDocument();
            expect(eventCard).toHaveTextContent('Test Event 1');
            expect(eventCard).toHaveTextContent('Test Venue');
        });
    });

    it('handles notification expansion', async () => {
        mockHookImplementation.mockReturnValue(populatedMockHook);
        renderWithProviders(<NotificationsPage />);

        await waitFor(() => {
            expect(screen.getByTestId('event-card-123')).toBeInTheDocument();
        });

        const expandButton = screen.getByRole('button', { name: /show notifications/i });
        fireEvent.click(expandButton);

        await waitFor(() => {
            expect(screen.getByText('New signup for slot 1')).toBeInTheDocument();
            expect(populatedMockHook.markAsRead).toHaveBeenCalledWith([1]);
        });
    });

    it('handles notification deletion', async () => {
        mockHookImplementation.mockReturnValue(populatedMockHook);
        renderWithProviders(<NotificationsPage />);

        await waitFor(() => {
            expect(screen.getByTestId('event-card-123')).toBeInTheDocument();
        });

        const selectButton = screen.getByRole('button', { name: /select event notifications/i });
        fireEvent.click(selectButton);

        const deleteButton = screen.getByRole('button', { name: /delete selected/i });
        fireEvent.click(deleteButton);

        await act(async () => {
            const confirmButton = screen.getByText('Delete');
            fireEvent.click(confirmButton);
        });

        expect(populatedMockHook.deleteNotifications).toHaveBeenCalledWith(['123']);
    });
});