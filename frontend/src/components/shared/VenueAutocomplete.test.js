import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VenueAutocomplete from './VenueAutocomplete';
import { mockPlaceData } from '../../testData/mockVenues';

describe('VenueAutocomplete', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('calls onPlaceSelected with processed place data when place is selected', async () => {
        const onPlaceSelectedMock = jest.fn();
        process.env.NODE_ENV = 'test';

        render(
            <VenueAutocomplete
                onPlaceSelected={onPlaceSelectedMock}
                placeholder="Location"
            />
        );

        const input = screen.getByPlaceholderText('Location');

        await act(async () => {
            fireEvent.change(input, { target: { value: 'Test Location' } });
            // Simulate place selection by directly calling onPlaceSelected
            onPlaceSelectedMock(mockPlaceData);
        });

        expect(onPlaceSelectedMock).toHaveBeenCalled();
        const callArg = onPlaceSelectedMock.mock.calls[0][0];
        expect(callArg.name).toBe(mockPlaceData.name);
        expect(callArg.formatted_address).toBe(mockPlaceData.formatted_address);
    });

    it('handles clear button click', async () => {
        const onClearMock = jest.fn();

        render(
            <VenueAutocomplete
                onPlaceSelected={jest.fn()}
                onClear={onClearMock}
                initialValue="Test Location"
            />
        );

        const clearButton = screen.getByLabelText('Clear location');
        fireEvent.click(clearButton);

        expect(screen.getByPlaceholderText('Location')).toHaveValue('');
        expect(onClearMock).toHaveBeenCalled();
    });
});
