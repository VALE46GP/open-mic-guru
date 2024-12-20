export const mockCreateEventResponses = {
    singleEvent: {
        ok: true,
        json: () => Promise.resolve({
            data: {
                event: {
                    id: 1,
                    name: 'Test Event',
                    start_time: '2024-03-01T19:00:00Z',
                    end_time: '2024-03-01T21:00:00Z',
                    slot_duration: { minutes: 10 },
                    setup_duration: { minutes: 5 },
                    additional_info: 'Test info',
                    event_types: ['music'],
                    active: true,
                    image: 'https://example.com/test.jpg'
                },
                venue: {
                    id: 1,
                    name: 'Test Venue',
                    address: '123 Test St',
                    latitude: 40.7128,
                    longitude: -74.0060
                }
            }
        })
    },
    venueCheck: {
        ok: true,
        json: () => Promise.resolve({ venueId: 1 })
    },
    createSuccess: {
        ok: true,
        json: () => Promise.resolve({ success: true })
    }
};
