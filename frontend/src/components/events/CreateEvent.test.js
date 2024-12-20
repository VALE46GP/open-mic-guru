import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateEvent from './CreateEvent';
import userEvent from '@testing-library/user-event';

// Mock event data for edit mode testing
const mockEventData = {
    data: {
        event: {
            id: 1,
            name: 'Test Event',
            start_time: new Date('2024-03-01T11:00:00.000Z').toISOString(),
            end_time: new Date('2024-03-01T13:00:00.000Z').toISOString(),
            slot_duration: { minutes: 10 },
            setup_duration: { minutes: 5 },
            additional_info: 'Test event description',
            event_types: ['music', 'comedy'],
            active: true,
            image: 'http://example.com/image.jpg'
        },
        venue: {
            name: 'Test Venue',
            address: '123 Test St',
            latitude: 40.7128,
            longitude: -74.0060
        }
    }
};

// Mock LocationMap
jest.mock('../shared/LocationMap', () => {
    return function MockLocationMap() {
        return <div data-testid="location-map">Mock Map</div>;
    };
});

// Mock axios
jest.mock('axios');

// Mock auth hook
// Mock authenticated fetch with proper response structure
const mockAuthenticatedFetch = jest.fn().mockImplementation((url, options) => {
    return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 1, success: true })
    });
});

jest.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        getToken: jest.fn(),
        getUserId: () => '1',
        user: { name: 'Test User' },
        authenticatedFetch: mockAuthenticatedFetch
    })
}));

// VenueAutocomplete mock with the mock venue data
const mockVenue = {
    name: 'Test Venue',
    address: '123 Test St',
    formatted_address: '123 Test St',
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

jest.mock('../shared/VenueAutocomplete', () => {
    return function MockVenueAutocomplete({ onPlaceSelected }) {
        return (
            <div
                data-testid="venue-autocomplete"
                onClick={() => {
                    onPlaceSelected(mockVenue);
                }}
            >
                Test Venue, 123 Test St
            </div>
        );
    };
});

// Render helper
const renderComponent = async (path = '/') => {
    let rendered;
    await act(async () => {
        rendered = render(
            <AuthProvider>
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route path="/" element={<CreateEvent />} />
                        <Route path="/events/:eventId/edit" element={<CreateEvent />} />
                        <Route path="/events/:eventId" element={<div>Event View</div>} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        );
    });
    return rendered;
};

describe('CreateEvent Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Mock URL.createObjectURL
        global.URL.createObjectURL = jest.fn(() => 'mock-url');

        // Mock authenticatedFetch more robustly
        mockAuthenticatedFetch.mockImplementation((url, options) => {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({
                    id: 1,
                    success: true,
                    uploadURL: 'https://example.com/upload'
                })
            });
        });

        // Mock fetch with method-specific responses
        global.fetch = jest.fn((url, options = {}) => {
            if (url.includes('/api/events/1') && !options.method) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockEventData)
                });
            }
            if (url.includes('/api/venues/checkOrCreate')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ venueId: 1 })
                });
            }
            if (url.includes('/api/events/1') && options.method === 'PATCH') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: 1, success: true })
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ id: 1 })
            });
        });
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    describe('Edit Mode', () => {
        it('loads and displays existing event data correctly', async () => {
            await renderComponent('/events/1/edit');

            // Select venue
            await act(async () => {
                const venueInput = screen.getByTestId('venue-autocomplete');
                fireEvent.click(venueInput);
            });

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Event Name')).toHaveValue('Test Event');
                expect(screen.getByPlaceholderText('Slot Duration (minutes)')).toHaveValue(10);
                expect(screen.getByPlaceholderText('Setup Duration (minutes)')).toHaveValue(5);
                expect(screen.getByPlaceholderText('Event Description')).toHaveValue('Test event description');
            });

            // Check event types
            const musicCheckbox = screen.getByRole('checkbox', { name: /music/i });
            const comedyCheckbox = screen.getByRole('checkbox', { name: /comedy/i });
            expect(musicCheckbox).toBeChecked();
            expect(comedyCheckbox).toBeChecked();

            // Verify image preview
            expect(screen.getByAltText('Event preview')).toHaveAttribute('src', 'http://example.com/image.jpg');
        });

        it('preserves UTC times when saving edited event', async () => {
            await renderComponent('/events/1/edit');

            // Select venue
            await act(async () => {
                const venueInput = screen.getByTestId('venue-autocomplete');
                fireEvent.click(venueInput);
            });

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Event Name')).toBeInTheDocument();
            });

            // Submit form
            await act(async () => {
                fireEvent.click(screen.getByText('Save'));
            });

            await waitFor(() => {
                const calls = mockAuthenticatedFetch.mock.calls;
                expect(calls.length).toBeGreaterThan(0);

                const eventCall = calls.find(([url, options]) =>
                    url.includes('/api/events/1') &&
                    options.method === 'PATCH'
                );

                expect(eventCall).toBeTruthy();
                const body = JSON.parse(eventCall[1].body);
                // Update the regex to match the actual ISO format with milliseconds
                expect(body.start_time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
                expect(body.end_time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
            });
        });

        it('handles event status changes correctly', async () => {
            await renderComponent('/events/1/edit');

            // Wait for form to load and venue to be set
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Event Name')).toBeInTheDocument();
            });

            // Select venue
            await act(async () => {
                const venueInput = screen.getByTestId('venue-autocomplete');
                fireEvent.click(venueInput);
            });

            // Click Cancel Event button to set pendingStatusChange
            await act(async () => {
                const cancelButton = screen.getByText('Cancel Event');
                fireEvent.click(cancelButton);
            });

            // Wait for pendingStatusChange to be reflected in the UI
            await waitFor(() => {
                expect(screen.getByText('Cancel Event').closest('button')).toHaveClass('create-event__status-button--pending');
            });

            // Now click Save to trigger the modal
            await act(async () => {
                const saveButton = screen.getByText('Save');
                fireEvent.click(saveButton);
            });

            // Wait for modal to appear
            await waitFor(() => {
                expect(screen.getByTestId('status-modal')).toBeInTheDocument();
            });

            // Click confirm button
            await act(async () => {
                const confirmButton = screen.getByText('Confirm');
                fireEvent.click(confirmButton);
            });

            // Verify the API call
            await waitFor(() => {
                const calls = mockAuthenticatedFetch.mock.calls;
                const eventCall = calls.find(([url, options]) =>
                    url.includes('/api/events/1') &&
                    options.method === 'PATCH'
                );

                expect(eventCall).toBeTruthy();
                const body = JSON.parse(eventCall[1].body);
                expect(body.active).toBe(false);
            });
        });
    });

    describe('Form Validation', () => {
        it('validates required fields', async () => {
            await renderComponent();
            jest.runOnlyPendingTimers();

            // Try to submit without required fields
            await act(async () => {
                fireEvent.click(screen.getByText('Submit'));
                jest.runOnlyPendingTimers();
            });

            expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Please select a location'));
        });

        it('validates time constraints', async () => {
            await renderComponent();

            // First select venue
            await act(async () => {
                const venueInput = screen.getByTestId('venue-autocomplete');
                fireEvent.click(venueInput);
            });

            // Set invalid times (end before start)
            await act(async () => {
                fireEvent.change(screen.getByLabelText(/start time/i), {
                    target: { value: '2024-03-01T15:00' }
                });
                fireEvent.change(screen.getByLabelText(/end time/i), {
                    target: { value: '2024-03-01T14:00' }
                });
            });

            // Submit form
            await act(async () => {
                fireEvent.click(screen.getByText('Submit'));
            });

            expect(global.alert).toHaveBeenCalledWith('Start time must be before end time.');
        });
    });

    describe('Image Handling', () => {
        it('handles image upload', async () => {
            await renderComponent();

            const file = new File(['test'], 'test.png', { type: 'image/png' });
            const input = screen.getByLabelText(/event image/i);

            await act(async () => {
                fireEvent.change(input, { target: { files: [file] } });
                await jest.runAllTimers();
            });

            await waitFor(() => {
                expect(screen.getByAltText('Event preview')).toBeInTheDocument();
                expect(screen.getByAltText('Event preview')).toHaveAttribute('src', 'mock-url');
            });
        });
    });
});