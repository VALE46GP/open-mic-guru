export const mockNotification = {
    id: 1,
    event_id: '123',
    event_name: 'Test Event 1',
    venue_name: 'Test Venue',
    start_time: '2024-02-01T08:00:00Z',
    is_performer: true,
    performer_slot_time: '2024-02-01T09:00:00Z',
    message: 'New signup for slot 1',
    is_read: false,
    created_at: '2024-02-01T08:00:00Z'
};

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
            event: mockNotification.event,
            notifications: [mockNotification]
        }
    }
};
