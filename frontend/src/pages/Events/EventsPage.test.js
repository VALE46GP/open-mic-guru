import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsPage from './EventsPage';
import { AuthProvider } from '../../context/AuthContext';
import '@testing-library/jest-dom';

// Mock the child components that we don't want to test here
jest.mock('../../components/events/EventsMap', () => {
    return function MockEventsMap({ events, onEventSelect }) {
        return (
            <div data-testid="mock-events-map">
                <button 
                    onClick={() => onEventSelect([events[0]])}
                    data-testid="select-event-button"
                >
                    Select First Event
                </button>
            </div>
        );
    };
});

// Mock VenueAutocomplete
jest.mock('../../components/shared/VenueAutocomplete', () => {
    return function MockVenueAutocomplete({ onPlaceSelected }) {
        return <input data-testid="mock-venue-autocomplete" />;
    };
});

// Mock Google Maps API
beforeAll(() => {
    const mockDate = new Date('2024-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    global.window.google = {
        maps: {
            LatLng: jest.fn((lat, lng) => ({ lat, lng })),
            LatLngBounds: jest.fn(() => ({
                extend: jest.fn(),
                contains: jest.fn(() => true),
                getSouthWest: jest.fn(),
                getNorthEast: jest.fn(),
            })),
            geometry: {
                spherical: {
                    computeDistanceBetween: jest.fn(() => 1000),
                },
            },
        },
    };
});

afterAll(() => {
    jest.useRealTimers();
});

const mockEvents = [
    {
        event_id: 1,
        event_name: 'Future Event',
        start_time: '2024-02-01T12:00:00Z',
        venue_name: 'Test Venue 1',
        host_name: 'Test Host 1',
        venue_latitude: '40.7128',
        venue_longitude: '-74.0060'
    },
    {
        event_id: 2,
        event_name: 'Past Event',
        start_time: '2023-12-01T12:00:00Z',
        venue_name: 'Test Venue 2',
        host_name: 'Test Host 2',
        venue_latitude: '40.7128',
        venue_longitude: '-74.0060'
    }
];

const renderWithProviders = (component) => {
    return render(
        <MemoryRouter>
            <AuthProvider>{component}</AuthProvider>
        </MemoryRouter>
    );
};

// Move this mock to the top, after the other mocks
jest.mock('../../components/events/EventCard', () => {
    return function MockEventCard({ event }) {
        return (
            <div data-testid={`event-card-${event.event_id}`} className="event-card">
                <div className="event-card__title">{event.event_name}</div>
                <div className="event-card__date">{event.start_time}</div>
            </div>
        );
    };
});

describe('EventsPage', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation((message) => {
            if (message.includes('Error fetching events')) {
                return;
            }
            console.error(message);
        });

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockEvents),
            })
        );
    });

    afterEach(() => {
        console.error.mockRestore();
        jest.clearAllMocks();
    });

    test('renders initial state and fetches events', async () => {
        await act(async () => {
            renderWithProviders(<EventsPage />);
        });

        // Check for title
        expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
        
        // Check for future event
        const futureEvent = await screen.findByTestId('event-card-1');
        expect(futureEvent).toBeInTheDocument();
        expect(futureEvent).toHaveTextContent('Future Event');
        
        // Verify past event is not in the upcoming events section
        const pastEvent = screen.queryByTestId('event-card-2');
        expect(pastEvent).not.toBeInTheDocument();
    });

    test('toggles past events visibility', async () => {
        await act(async () => {
            renderWithProviders(<EventsPage />);
        });

        const toggleButton = screen.getByText('Show Past Events');
        await act(async () => {
            fireEvent.click(toggleButton);
        });

        expect(screen.getByText('Past Events')).toBeInTheDocument();
        expect(screen.getByText('Past Event')).toBeInTheDocument();
    });

    test('filters events by search term', async () => {
        await act(async () => {
            renderWithProviders(<EventsPage />);
        });

        const searchInput = screen.getByPlaceholderText('Filter events by name, venue, or host');
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Future Event' } });
        });

        expect(screen.getByText('Future Event')).toBeInTheDocument();
        expect(screen.queryByText('Past Event')).not.toBeInTheDocument();
    });

    test('handles API error gracefully', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: false,
                status: 500,
            })
        );

        await act(async () => {
            renderWithProviders(<EventsPage />);
        });

        expect(await screen.findByText('No upcoming events found')).toBeInTheDocument();
    });

    test('selects event from map', async () => {
        await act(async () => {
            renderWithProviders(<EventsPage />);
        });

        const selectButton = screen.getByTestId('select-event-button');
        await act(async () => {
            fireEvent.click(selectButton);
        });

        const selectedEvents = screen.getAllByText('Future Event');
        expect(selectedEvents.length).toBeGreaterThan(0);
    });

    test('filters events by date correctly', async () => {
        await act(async () => {
            renderWithProviders(<EventsPage />);
        });

        // Initially only future events should be visible
        expect(screen.getByTestId('event-card-1')).toBeInTheDocument(); // Future event
        expect(screen.queryByTestId('event-card-2')).not.toBeInTheDocument(); // Past event

        // Show past events
        fireEvent.click(screen.getByText('Show Past Events'));
        
        // Now both events should be visible
        expect(screen.getByTestId('event-card-1')).toBeInTheDocument(); // Future event
        expect(screen.getByTestId('event-card-2')).toBeInTheDocument(); // Past event
        
        // Hide past events
        fireEvent.click(screen.getByText('Hide Past Events'));
        
        // Only future event should be visible again
        expect(screen.getByTestId('event-card-1')).toBeInTheDocument();
        expect(screen.queryByTestId('event-card-2')).not.toBeInTheDocument();
    });
});