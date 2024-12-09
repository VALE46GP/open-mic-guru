import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import NotificationsPage from './NotificationsPage';
import { renderWithProviders } from '../../testUtils/testUtils';
import '@testing-library/jest-dom';

// Create mock hook implementation function
const mockHookImplementation = jest.fn();

// Mock EventCard component with proper prop handling
jest.mock('../../components/events/EventCard', () => ({
    __esModule: true,
    default: function MockEventCard({ event }) {
        return (
            <div data-testid={`event-card-${event.event_id || 'unknown'}`}>
                <h3>{event.event_name || 'Unknown Event'}</h3>
                <p>{event.venue_name || 'Unknown Venue'}</p>
            </div>
        );
    }
}));

// Sample mock notifications data
const mockNotification = {
    id: 1,
    event_id: '123',
    event_name: 'Test Event 1', // Add this to match grouping logic
    venue_name: 'Test Venue',
    start_time: '2024-02-01T08:00:00Z',
    is_performer: true,
    performer_slot_time: '2024-02-01T09:00:00Z',
    message: 'New signup for slot 1',
    is_read: false,
    created_at: '2024-02-01T08:00:00Z'
};

// Create separate mock hooks for different test cases
const emptyMockHook = {
    notifications: [],
    markAsRead: jest.fn().mockResolvedValue({}),
    deleteNotifications: jest.fn().mockResolvedValue({}),
    fetchNotifications: jest.fn(),
    groupedNotifications: {}
};

const populatedMockHook = {
    notifications: [mockNotification],
    markAsRead: jest.fn().mockResolvedValue({}),
    deleteNotifications: jest.fn().mockResolvedValue({}),
    fetchNotifications: jest.fn(),
    groupedNotifications: {
        '123': {
            event: mockNotification.event,
            notifications: [mockNotification]
        }
    }
};

jest.mock('../../context/NotificationsContext', () => ({
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

        const confirmButton = screen.getByText('Delete');
        fireEvent.click(confirmButton);

        expect(populatedMockHook.deleteNotifications).toHaveBeenCalled();
    });
});