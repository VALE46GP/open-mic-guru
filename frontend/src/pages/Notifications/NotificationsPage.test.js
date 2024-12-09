import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import NotificationsPage from './NotificationsPage';
import { renderWithProviders } from '../../testUtils/testUtils';

// Mock EventCard component
jest.mock('../../components/events/EventCard', () => {
    return function MockEventCard({ event }) {
        return (
            <div data-testid={`event-card-${event.event_id}`} className="event-card">
                {event.event_name}
                <p>{event.venue_name}</p>
            </div>
        );
    };
});

// Sample mock notifications data
const mockNotification = {
    id: 1,
    event_id: 1,
    event_name: 'Test Event 1',
    message: 'New signup for slot 1',
    is_read: false,
    created_at: '2024-02-01T08:00:00Z',
    venue_name: 'Test Venue',
    host_name: 'Test Host',
    active: true,
    event_start_time: '2024-02-01T08:00:00Z'
};

// Mock the notifications context module
jest.mock('../../context/NotificationsContext', () => ({
    useNotifications: () => ({
        notifications: mockContextValue.notifications,
        unreadCount: mockContextValue.unreadCount,
        markAsRead: mockContextValue.markAsRead,
        deleteNotifications: mockContextValue.deleteNotifications,
        fetchNotifications: mockContextValue.fetchNotifications
    })
}));

// Create a variable to hold mock context value that we can modify in tests
let mockContextValue = {
    notifications: [],
    unreadCount: 0,
    markAsRead: jest.fn().mockResolvedValue({}),
    deleteNotifications: jest.fn().mockResolvedValue({}),
    fetchNotifications: jest.fn()
};

describe('NotificationsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock context value before each test
        mockContextValue = {
            notifications: [],
            unreadCount: 0,
            markAsRead: jest.fn().mockResolvedValue({}),
            deleteNotifications: jest.fn().mockResolvedValue({}),
            fetchNotifications: jest.fn()
        };
    });

    it('renders empty state when there are no notifications', async () => {
        render(<NotificationsPage />);
        expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    it('renders notifications list', async () => {
        // Set up mock context with notifications
        mockContextValue.notifications = [mockNotification];
        mockContextValue.unreadCount = 1;

        await act(async () => {
            render(<NotificationsPage />);
        });

        await waitFor(() => {
            expect(screen.queryByText('No notifications')).not.toBeInTheDocument();
            expect(screen.getByText('Test Event 1')).toBeInTheDocument();
            expect(screen.getByText('Test Venue')).toBeInTheDocument();
        });
    });

    it('handles notification expansion', async () => {
        // Set up mock context with notifications
        mockContextValue.notifications = [mockNotification];
        mockContextValue.unreadCount = 1;

        await act(async () => {
            render(<NotificationsPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Test Event 1')).toBeInTheDocument();
        });

        const expandButton = screen.getByLabelText('Show notifications');
        await act(async () => {
            fireEvent.click(expandButton);
        });

        expect(screen.getByText('New signup for slot 1')).toBeInTheDocument();
        expect(mockContextValue.markAsRead).toHaveBeenCalledWith([1]);
    });

    it('handles notification deletion', async () => {
        // Set up mock context with notifications
        mockContextValue.notifications = [mockNotification];
        mockContextValue.unreadCount = 1;

        await act(async () => {
            render(<NotificationsPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Test Event 1')).toBeInTheDocument();
        });

        const selectButton = screen.getByLabelText('Select event notifications');
        await act(async () => {
            fireEvent.click(selectButton);
        });

        const deleteButton = screen.getByLabelText('Delete Selected');
        await act(async () => {
            fireEvent.click(deleteButton);
        });

        const confirmButton = screen.getByText('Delete');
        await act(async () => {
            fireEvent.click(confirmButton);
        });

        expect(mockContextValue.deleteNotifications).toHaveBeenCalledWith(['1']);
    });
});