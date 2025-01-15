import { mockNotification } from '../testData/mockNotifications';

export const emptyMockHook = {
    notifications: [],
    markAsRead: jest.fn().mockResolvedValue({}),
    deleteNotifications: jest.fn().mockResolvedValue({}),
    fetchNotifications: jest.fn(),
    groupedNotifications: {}
};

export const populatedMockHook = {
    notifications: [mockNotification],
    markAsRead: jest.fn().mockResolvedValue({}),
    deleteNotifications: jest.fn().mockResolvedValue({}),
    fetchNotifications: jest.fn(),
    groupedNotifications: {
        '123': {
            event: {
                event_id: '123',
                event_name: 'Test Event 1',
                venue_name: 'Test Venue',
                start_time: '2024-02-01T08:00:00Z'
            },
            notifications: [mockNotification],
            venue: mockNotification.venue
        }
    }
}; 