export const mockEvents = [
    {
        event_id: 1,
        event_name: 'Future Event',
        event_image: 'https://open-mic-guru.s3.us-west-1.amazonaws.com/events/1732070975571-Hackerthon.jpg',
        start_time: '2024-02-01T08:00:00Z',
        end_time: '2024-02-01T10:00:00Z',
        setup_duration: {
            'minutes': 5
        },
        slot_duration: {
            'minutes': 10
        },
        additional_info: 'This is additional info.',
        event_types: ['music'],
        active: true,
        venue_id: 1,
    },
    {
        event_id: 2,
        event_name: 'Past Event',
        event_image: 'https://open-mic-guru.s3.us-west-1.amazonaws.com/events/1732153739579-1318B997-A93F-4C88-B99A-7C9FC18ED8A1.jpeg',
        start_time: '2023-12-01T06:00:00Z',
        end_time: '2023-12-01T10:00:00Z',
        setup_duration: {
            'minutes': 5
        },
        slot_duration: {
            'minutes': 10
        },
        additional_info: 'This is additional info.',
        event_types: ['comedy'],
        active: false,
        venue_id: 2,
    },
];

export const mockVenueForCreate = {
    name: 'Test Venue',
    address: '123 Test St',
    formatted_address: '123 Test St',
    geometry: {
        location: {
            lat: () => 40.7128,
            lng: () => -74.0060
        }
    },
    timezone: 'America/Los_Angeles',
    latitude: 40.7128,
    longitude: -74.0060,
    address_components: [
        { short_name: '123', types: ['street_number'] },
        { short_name: 'Test St', types: ['route'] }
    ]
};

export const mockEventResponse = {
    id: 1,
    name: 'Test Event',
    venue_id: 1,
    start_time: '2024-12-26T03:00:00.000Z',
    end_time: '2024-12-26T05:00:00.000Z',
    slot_duration: 600,
    setup_duration: 300,
    additional_info: '',
    types: [],
    active: true
};