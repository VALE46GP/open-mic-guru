import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsPage from './EventsPage';
import { AuthProvider } from '../../context/AuthContext';
import { WebSocketProvider } from '../../context/WebSocketContext';
import { mockEvents } from '../../testData';
import '@testing-library/jest-dom';

// Move component mocks to __mocks__ directory and use jest.mock to reference them
jest.mock('../../components/events/EventsMap', () => require('../../__mocks__/EventsMap'));
jest.mock('../../components/events/EventCard', () => require('../../__mocks__/EventCard'));
jest.mock('../../components/shared/VenueAutocomplete', () => require('../../__mocks__/VenueAutocomplete'));

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

describe('EventsPage', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    data: {
                        events: mockEvents
                    }
                })
            })
        );
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    test('renders upcoming events on load', async () => {
        await act(async () => {
            renderWithProviders(<EventsPage />);
        });

        expect(screen.getByText('Upcoming Events')).toBeInTheDocument();

        await act(async () => {
            await waitFor(() => {
                expect(screen.getByTestId('event-card-1')).toBeInTheDocument();
            });
        });
    });

    test('filters events by type', async () => {
        await act(async () => {
            renderWithProviders(<EventsPage />);
        });

        await act(async () => {
            await waitFor(() => {
                expect(screen.getByTestId('event-card-1')).toBeInTheDocument();
            });
        });

        fireEvent.click(screen.getByText('Filter by Type'));
        const musicCheckbox = screen.getByLabelText('Music');
        fireEvent.click(musicCheckbox);

        await waitFor(() => {
            expect(screen.getByTestId('event-card-1')).toBeInTheDocument();
            expect(screen.queryByTestId('event-card-2')).not.toBeInTheDocument();
        });
    });

    test('searches events by name', async () => {
        renderWithProviders(<EventsPage />);

        const searchInput = screen.getByPlaceholderText('Filter events by name, venue, or host');

        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Future' } });
        });

        await waitFor(() => {
            expect(screen.getByTestId('event-card-1')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('event-card-2')).not.toBeInTheDocument();
    });

    test('filters events by location', async () => {
        renderWithProviders(<EventsPage />);

        const autocomplete = screen.getByTestId('mock-venue-autocomplete');
        fireEvent.change(autocomplete);

        await waitFor(() => {
            expect(screen.getByTestId('event-card-1')).toBeInTheDocument();
        });
    });
});