export const mockUserResponses = {
    success: {
        user: {
            id: '123',
            name: 'Test User',
            email: 'test@example.com',
            social_media_accounts: [],
            image: null,
            events: [
                {
                    event_id: 1,
                    event_name: 'Future Event',
                    event: {
                        event_id: 1,
                        event_name: 'Future Event',
                        start_time: '2024-02-01T08:00:00Z',
                        active: true
                    },
                    is_host: true,
                    is_performer: false,
                    performer_slot_time: null
                }
            ]
        }
    },
    error: {
        message: 'User not found',
        status: 404
    }
};
