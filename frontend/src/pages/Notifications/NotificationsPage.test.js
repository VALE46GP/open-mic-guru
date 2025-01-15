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

    it('renders notification timestamps in local timezone', async () => {
        const testNotification = {
            id: 1,
            event_id: '123',
            event_name: 'Test Event 1',
            venue_name: 'Test Venue',
            venue_utc_offset: -5,
            venue_address: '123 Test St',
            venue_latitude: 0,
            venue_longitude: 0,
            host_name: 'Test Host',
            event_start_time: '2024-02-01T08:00:00Z',
            event_image: null,
            event_types: [],
            active: true,
            deleted: false,
            is_host: false,
            is_performer: false,
            created_at: '2024-01-01T12:00:00Z',
            message: 'Test notification message',
            is_read: false
        };
        
        const mockHook = {
            ...populatedMockHook,
            notifications: [testNotification],
            markAsRead: jest.fn().mockResolvedValue({}),
            deleteNotifications: jest.fn().mockResolvedValue({}),
            fetchNotifications: jest.fn()
        };

        mockHookImplementation = () => mockHook;

        renderWithProviders(<NotificationsPage />);
        
        await waitFor(() => {
            expect(screen.getByTestId('event-card-123')).toBeInTheDocument();
        });

        const expandButton = screen.getByRole('button', { name: /show notifications/i });
        await act(async () => {
            fireEvent.click(expandButton);
        });

        await waitFor(() => {
            const timestampElements = screen.getAllByText(/\d{1,2}:\d{2}/);
            expect(timestampElements.length).toBeGreaterThan(0);
        });
    });
});