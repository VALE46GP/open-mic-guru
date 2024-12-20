import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import VenueAutocomplete from './VenueAutocomplete';

const mockPlace = {
    name: 'Test Venue',
    formatted_address: '123 Test St, Test City, TC 12345',
    geometry: {
        location: {
            lat: () => 40.7128,
            lng: () => -74.0060
        },
        viewport: {
            getNorthEast: () => ({ lat: () => 40.7128, lng: () => -74.0060 }),
            getSouthWest: () => ({ lat: () => 40.7128, lng: () => -74.0060 })
        }
    },
    address_components: [
        { short_name: '123', long_name: '123', types: ['street_number'] },
        { short_name: 'Test St', long_name: 'Test Street', types: ['route'] }
    ],
    place_id: 'test_place_id',
    utc_offset_minutes: -240
};

describe('VenueAutocomplete', () => {
    let mockAutocomplete;
    let addListenerSpy;

    beforeEach(() => {
        // Mock Google Maps Autocomplete
        addListenerSpy = jest.fn();
        mockAutocomplete = {
            addListener: addListenerSpy,
            getPlace: () => mockPlace
        };

        // Mock Google Maps global object
        global.google = {
            maps: {
                places: {
                    Autocomplete: jest.fn(() => mockAutocomplete)
                },
                event: {
                    clearInstanceListeners: jest.fn()
                }
            }
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders with placeholder text', () => {
        render(<VenueAutocomplete onPlaceSelected={jest.fn()} />);
        expect(screen.getByPlaceholderText('Location')).toBeInTheDocument();
    });

    it('renders with custom placeholder text', () => {
        render(
            <VenueAutocomplete
                onPlaceSelected={jest.fn()}
                placeholder="Custom Placeholder"
            />
        );
        expect(screen.getByPlaceholderText('Custom Placeholder')).toBeInTheDocument();
    });

    it('initializes with provided initial value', () => {
        render(
            <VenueAutocomplete
                onPlaceSelected={jest.fn()}
                initialValue="Initial Location"
            />
        );
        expect(screen.getByDisplayValue('Initial Location')).toBeInTheDocument();
    });

    it('shows clear button when input has value', () => {
        render(
            <VenueAutocomplete
                onPlaceSelected={jest.fn()}
                initialValue="Test Location"
            />
        );
        expect(screen.getByLabelText('Clear location')).toBeInTheDocument();
    });

    it('clears input when clear button is clicked', async () => {
        const onClearMock = jest.fn();
        render(
            <VenueAutocomplete
                onPlaceSelected={jest.fn()}
                initialValue="Test Location"
                onClear={onClearMock}
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByLabelText('Clear location'));
        });

        expect(screen.getByDisplayValue('')).toBeInTheDocument();
        expect(onClearMock).toHaveBeenCalled();
    });

    it('calls onPlaceSelected with processed place data when place is selected', async () => {
        const onPlaceSelectedMock = jest.fn();
        render(<VenueAutocomplete onPlaceSelected={onPlaceSelectedMock} />);

        // Wait for component to initialize
        await waitFor(() => {
            expect(global.google.maps.places.Autocomplete).toHaveBeenCalled();
        });

        // Simulate place selection
        const placeChangedCallback = addListenerSpy.mock.calls[0][1];
        await act(async () => {
            placeChangedCallback();
        });

        expect(onPlaceSelectedMock).toHaveBeenCalledWith(expect.objectContaining({
            name: mockPlace.name,
            address: mockPlace.formatted_address,
            geometry: expect.any(Object)
        }));
    });

    it('handles missing geometry in place data', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const onPlaceSelectedMock = jest.fn();
        const invalidPlace = { name: 'Invalid Place' };

        mockAutocomplete.getPlace = () => invalidPlace;

        render(<VenueAutocomplete onPlaceSelected={onPlaceSelectedMock} />);

        // Wait for component to initialize
        await waitFor(() => {
            expect(global.google.maps.places.Autocomplete).toHaveBeenCalled();
        });

        // Simulate place selection
        const placeChangedCallback = addListenerSpy.mock.calls[0][1];
        await act(async () => {
            placeChangedCallback();
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            'No valid place selected or place has no geometry:',
            invalidPlace
        );
        expect(onPlaceSelectedMock).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('updates input value when user types', async () => {
        render(<VenueAutocomplete onPlaceSelected={jest.fn()} />);

        const input = screen.getByPlaceholderText('Location');
        await act(async () => {
            fireEvent.change(input, { target: { value: 'New Location' } });
        });

        expect(input.value).toBe('New Location');
    });

    it('handles reset trigger', async () => {
        const onResetCompleteMock = jest.fn();
        const { rerender } = render(
            <VenueAutocomplete
                onPlaceSelected={jest.fn()}
                initialValue="Test Location"
                resetTrigger={false}
                onResetComplete={onResetCompleteMock}
            />
        );

        // Trigger reset
        rerender(
            <VenueAutocomplete
                onPlaceSelected={jest.fn()}
                initialValue="Test Location"
                resetTrigger={true}
                onResetComplete={onResetCompleteMock}
            />
        );

        expect(screen.getByDisplayValue('')).toBeInTheDocument();
        expect(onResetCompleteMock).toHaveBeenCalled();
    });

    it('cleans up Google Maps listeners on unmount', async () => {
        const { unmount } = render(<VenueAutocomplete onPlaceSelected={jest.fn()} />);

        // Wait for initialization
        await waitFor(() => {
            expect(global.google.maps.places.Autocomplete).toHaveBeenCalled();
        });

        unmount();

        expect(global.google.maps.event.clearInstanceListeners).toHaveBeenCalled();
    });
});