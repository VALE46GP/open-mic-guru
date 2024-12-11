// NotificationsPage.test.js
import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import NotificationsPage from './NotificationsPage';
import { renderWithProviders } from '../../testUtils/testUtils';
import '@testing-library/jest-dom';
import { mockNotification, emptyMockHook, populatedMockHook } from '../../testData/mockNotifications';

// Mock EventCard component
jest.mock('../../components/events/EventCard', () => ({
    __esModule: true,
    default: function MockEventCard({ event }) {
        return (
            <div data-testid={`event-card-${event.event_id}`} className="event-card">
                <h3>{event.event_name}</h3>
                <p>{event.venue_name}</p>
                {!event.active && <div>Event Cancelled</div>}
            </div>
        );
    }
}));

// Mock NotificationsContext
let mockHookImplementation = () => populatedMockHook;

jest.mock('../../context/NotificationsContext', () => ({
    useNotifications: () => mockHookImplementation()
}));

describe('NotificationsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockHookImplementation = () => populatedMockHook;
    });

    it('renders empty state when there are no notifications', async () => {
        mockHookImplementation = () => emptyMockHook;
        renderWithProviders(<NotificationsPage />);
        expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    it('renders notifications list', async () => {
        renderWithProviders(<NotificationsPage />);

        await waitFor(() => {
            const eventCard = screen.getByTestId('event-card-123');
            expect(eventCard).toBeInTheDocument();
            expect(within(eventCard).getByText('Test Event 1')).toBeInTheDocument();
            expect(within(eventCard).getByText('Test Venue')).toBeInTheDocument();
        });
    });

    it('handles notification expansion', async () => {
        renderWithProviders(<NotificationsPage />);

        await waitFor(() => {
            expect(screen.getByTestId('event-card-123')).toBeInTheDocument();
        });

        const expandButton = screen.getByRole('button', { name: /show notifications/i });
        await act(async () => {
            fireEvent.click(expandButton);
        });

        await waitFor(() => {
            expect(screen.getByText('New signup for slot 1')).toBeInTheDocument();
            expect(populatedMockHook.markAsRead).toHaveBeenCalledWith([1]);
        });
    });

    it('handles notification deletion', async () => {
        renderWithProviders(<NotificationsPage />);

        await waitFor(() => {
            expect(screen.getByTestId('event-card-123')).toBeInTheDocument();
        });

        const selectButton = screen.getByRole('button', { name: /select event notifications/i });
        await act(async () => {
            fireEvent.click(selectButton);
        });

        const deleteButton = screen.getByRole('button', { name: /delete selected/i });
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        const confirmButton = screen.getByText('Delete');
        await act(async () => {
            fireEvent.click(confirmButton);
        });

        expect(populatedMockHook.deleteNotifications).toHaveBeenCalledWith(['123']);
    });
});