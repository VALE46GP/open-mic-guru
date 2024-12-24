import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateEvent from './CreateEvent';
import { mockVenueForCreate } from '../../testData/mockEvents';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useParams: () => ({ eventId: undefined })
}));

jest.mock('../shared/LocationMap', () => () => null);
jest.mock('../shared/VenueAutocomplete', () => ({ onPlaceSelected }) => (
    <button data-testid="mock-venue-select" onClick={() => onPlaceSelected(mockVenueForCreate)}>
        Select Venue
    </button>
));

const mockAuthFetch = jest.fn();

jest.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        getToken: () => 'mock-token',
        getUserId: () => '1',
        authenticatedFetch: (...args) => mockAuthFetch(...args)
    })
}));

describe('CreateEvent', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockAuthFetch.mockImplementation(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 1 })
        }));
        global.fetch = jest.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ venueId: 1 })
        }));
        mockNavigate.mockClear();
        mockAuthFetch.mockClear();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('creates event successfully', async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AuthProvider>
                        <CreateEvent />
                    </AuthProvider>
                </MemoryRouter>
            );
        });

        await act(async () => {
            fireEvent.click(screen.getByTestId('mock-venue-select'));
            await jest.runAllTimers();
        });

        await act(async () => {
            fireEvent.change(screen.getByLabelText(/event name/i), {
                target: { value: 'Test Event' }
            });
            fireEvent.change(screen.getByLabelText(/start time/i), {
                target: { value: '2024-12-25T19:00' }
            });
            fireEvent.change(screen.getByLabelText(/end time/i), {
                target: { value: '2024-12-25T21:00' }
            });
        });

        await act(async () => {
            fireEvent.click(screen.getByText(/submit/i));
            await Promise.resolve();
            await jest.runAllTimers();
        });

        await waitFor(() => {
            expect(mockAuthFetch).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/events/1');
        });
    });
});