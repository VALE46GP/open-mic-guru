import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsPage from './EventsPage';
import { AuthProvider } from '../../context/AuthContext';
import { WebSocketProvider } from '../../context/WebSocketContext';
import '@testing-library/jest-dom';

jest.mock('../../components/events/EventsMap', () => {
    return function MockEventsMap({ events, onEventSelect }) {
        return (
            <div data-testid="mock-events-map">
                {events.map((event) => (
                    <button
                        key={event.event_id}
                        onClick={() => onEventSelect([event])}
                        data-testid={`select-event-button-${event.event_id}`}
                    >
                        {event.event_name}
                    </button>
                ))}
            </div>
        );
    };
});

jest.mock('../../components/shared/VenueAutocomplete', () => {
    return function MockVenueAutocomplete({ onPlaceSelected }) {
        return (
            <input
                data-testid="mock-venue-autocomplete"
                placeholder="Search venue"
                onChange={() => onPlaceSelected({ lat: 40.7128, lng: -74.0060 })}
            />
        );
    };
});

jest.mock('../../components/events/EventCard', () => {
    return function MockEventCard({ event }) {
        return (
            <div data-testid={`event-card-${event.event_id}`} className="event-card">
                <div className="event-card__title">{event.event_name}</div>
                <div className="event-card__date">{event.start_time}</div>
                {!event.active && <div className="event-card__cancelled">Event Cancelled</div>}
            </div>
        );
    };
});

// Mock data
const mockEvents = [
    {
        event_id: 1,
        event_name: 'Future Event',
        start_time: '2024-02-01T12:00:00Z',
        event_types: ['music'],
        active: true,
    },
    {
        event_id: 2,
        event_name: 'Past Event',
        start_time: '2023-12-01T12:00:00Z',
        event_types: ['comedy'],
        active: true,
    },
];

const mockWebSocketContext = {
    lastMessage: null,
    sendMessage: jest.fn(),
    setLastMessage: jest.fn(),
    subscribe: jest.fn(),
    connected: true
};

const renderWithProviders = (component) => {
    return render(
        <MemoryRouter>
            <AuthProvider>
                <WebSocketProvider value={mockWebSocketContext}>
                    {component}
                </WebSocketProvider>
            </AuthProvider>
        </MemoryRouter>
    );
};

// Tests
describe('EventsPage', () => {
    beforeEach(() => {
        jest.useFakeTimers('modern');
        jest.setSystemTime(new Date('2024-01-01T12:00:00Z'));

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockEvents),
            })
        );
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    test('renders upcoming events on load', async () => {
        await act(async () => renderWithProviders(<EventsPage />));

        expect(screen.getByText('Upcoming Events')).toBeInTheDocument();

        await waitFor(() => {
            const eventCard = screen.getByTestId('event-card-1');
            expect(eventCard).toBeInTheDocument();
        });
    });

    test('filters events by type', async () => {
        await act(async () => renderWithProviders(<EventsPage />));

        fireEvent.click(screen.getByText('Filter by Type'));

        const musicCheckbox = screen.getByLabelText('Music');
        fireEvent.click(musicCheckbox);

        await waitFor(() => {
            const futureEventCard = screen.getByTestId('event-card-1');
            expect(futureEventCard).toBeInTheDocument();
        });

        expect(screen.queryByTestId('event-card-2')).not.toBeInTheDocument();
    });

    test('searches events by name', async () => {
        await act(async () => renderWithProviders(<EventsPage />));

        const searchInput = screen.getByPlaceholderText('Filter events by name, venue, or host');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Future' } });
        });

        await waitFor(() => {
            const futureEventCard = screen.getByTestId('event-card-1');
            expect(futureEventCard).toBeInTheDocument();
        });

        expect(screen.queryByTestId('event-card-2')).not.toBeInTheDocument();
    });

    test('filters events by location', async () => {
        await act(async () => renderWithProviders(<EventsPage />));

        const autocomplete = screen.getByTestId('mock-venue-autocomplete');
        fireEvent.change(autocomplete);

        await waitFor(() => {
            const futureEventCard = screen.getByTestId('event-card-1');
            expect(futureEventCard).toBeInTheDocument();
        });
    });

    /*
    Note: WebSocket event updates are not unit tested here because:
    1. The functionality is covered by backend tests
    2. The real-time update flow is tested in E2E tests
    */
});