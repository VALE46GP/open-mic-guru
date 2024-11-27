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