import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateEvent from './CreateEvent';
import userEvent from '@testing-library/user-event';

const mockVenue = {
    name: 'Test Venue',
    address: '123 Test St',
    latitude: 40.7128,
    longitude: -74.0060,
    geometry: {
        location: {
            lat: () => 40.7128,
            lng: () => -74.0060
        }
    },
    address_components: [
        { short_name: '123' },
        { short_name: 'Test St' }
    ]
};

// Mocks
jest.mock('axios');
jest.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        getToken: jest.fn(),
        getUserId: () => '1',
        user: { name: 'Test User' },
        authenticatedFetch: jest.fn().mockImplementation((url, options) =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ id: 1 })
            })
        )
    })
}));

let venueSelectCallback = null;

// VenueAutocomplete mock that saves the callback
jest.mock('../shared/VenueAutocomplete', () => {
    return function MockVenueAutocomplete({ onPlaceSelected }) {
        return (
            <input
                data-testid="venue-autocomplete"
                placeholder="Choose a location"
                onChange={() => onPlaceSelected({
                    name: 'Test Venue',
                    address: '123 Test St',
                    formatted_address: '123 Test St',
                    geometry: {
                        location: {
                            lat: () => 40.7128,
                            lng: () => -74.0060
                        }
                    }
                })}
            />
        );
    };
});

jest.mock('../shared/LocationMap', () => {
    return function MockLocationMap() {
        return <div data-testid="location-map" />;
    };
});

const renderComponent = () => {
    return render(
        <AuthProvider>
            <MemoryRouter>
                <CreateEvent />
            </MemoryRouter>
        </AuthProvider>
    );
};

describe('CreateEvent Component', () => {
    beforeEach(() => {
        global.fetch = jest.fn().mockImplementation((url) =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ venueId: 1 })
            })
        );
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        global.alert = jest.fn();
        venueSelectCallback = null;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('validates venue selection', async () => {
        renderComponent();

        await act(async () => {
            fireEvent.click(screen.getByText(/submit/i));
        });

        expect(global.alert).toHaveBeenCalledWith('Please select a location from the dropdown.');
    });

    it('validates start time before end time', async () => {
        renderComponent();

        // Select venue first
        await act(async () => {
            const venueInput = screen.getByTestId('venue-autocomplete');
            fireEvent.change(venueInput, { target: { value: 'Test Venue' } });
        });

        // Fill form with invalid times
        await act(async () => {
            fireEvent.change(screen.getByLabelText(/event name/i), {
                target: { value: 'Test Event' }
            });
            fireEvent.change(screen.getByLabelText(/start time/i), {
                target: { value: '2024-03-01T16:00' }
            });
            fireEvent.change(screen.getByLabelText(/end time/i), {
                target: { value: '2024-03-01T14:00' }
            });
        });

        // Submit form
        await act(async () => {
            fireEvent.click(screen.getByText(/submit/i));
        });

        expect(global.alert).toHaveBeenCalledWith('Start time must be before end time.');
    });

    it('successfully submits form with valid data', async () => {
        renderComponent();

        // Select venue first
        await act(async () => {
            const venueInput = screen.getByTestId('venue-autocomplete');
            fireEvent.change(venueInput, { target: { value: 'Test Venue' } });
        });

        // Fill form with valid data
        await act(async () => {
            fireEvent.change(screen.getByLabelText(/event name/i), {
                target: { value: 'Test Event' }
            });
            fireEvent.change(screen.getByLabelText(/start time/i), {
                target: { value: '2024-03-01T14:00' }
            });
            fireEvent.change(screen.getByLabelText(/end time/i), {
                target: { value: '2024-03-01T16:00' }
            });
            fireEvent.change(screen.getByLabelText(/slot duration/i), {
                target: { value: '10' }
            });
            fireEvent.change(screen.getByLabelText(/setup duration/i), {
                target: { value: '5' }
            });
        });

        // Submit form
        await act(async () => {
            fireEvent.click(screen.getByText(/submit/i));
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/venues/checkOrCreate'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    body: expect.any(String)
                })
            );
        });
    });

    it('handles image upload', async () => {
        renderComponent();

        const file = new File(['test'], 'test.png', { type: 'image/png' });

        await act(async () => {
            const input = screen.getByLabelText(/event image/i);
            await userEvent.upload(input, file);
        });

        expect(screen.getByAltText('Event preview')).toBeInTheDocument();
    });

    it('handles slot duration input', async () => {
        renderComponent();

        await act(async () => {
            fireEvent.change(screen.getByLabelText(/slot duration/i), {
                target: { value: '5' }
            });
        });

        expect(screen.getByLabelText(/slot duration/i)).toHaveValue(5);
    });

    it('handles event types selection', async () => {
        renderComponent();

        await act(async () => {
            const musicCheckbox = screen.getByLabelText(/music/i);
            fireEvent.click(musicCheckbox);
        });

        const musicCheckbox = screen.getByLabelText(/music/i);
        expect(musicCheckbox).toBeChecked();
    });
});