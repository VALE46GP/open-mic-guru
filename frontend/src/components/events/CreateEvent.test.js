import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateEvent from './CreateEvent';
import { mockVenueForCreate } from '../../testData/mockEvents';

// Force test environment
process.env.NODE_ENV = 'test';

// Mocks
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
    useParams: () => ({ eventId: undefined })
}));

jest.mock('../shared/LocationMap', () => () => null);
jest.mock('../shared/VenueAutocomplete', () => ({ onPlaceSelected }) => (
    <button data-testid="mock-venue-select" onClick={() => onPlaceSelected(mockVenueForCreate)}>Select Venue</button>
));
jest.mock('../shared/TextInput', () => props => <input {...props} />);
jest.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        getToken: () => 'mock-token',
        getUserId: () => '1',
        authenticatedFetch: jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: 1 })
        })
    })
}));

describe('CreateEvent', () => {
    let unmountTest;

    beforeAll(() => {
        global.google = { maps: { places: {} } };
    });

    beforeEach(() => {
        jest.resetModules();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ venueId: 1 }),
        });
        global.alert = jest.fn();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('creates event successfully', async () => {
        const { unmount } = render(
            <MemoryRouter>
                <AuthProvider>
                    <CreateEvent />
                </AuthProvider>
            </MemoryRouter>
        );
        unmountTest = unmount;

        fireEvent.click(screen.getByTestId('mock-venue-select'));
        fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: 'Test Event' }});
        fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '2024-12-25T19:00' }});
        fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '2024-12-25T21:00' }});
        fireEvent.click(screen.getByText(/submit/i));

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), { timeout: 1000 });
    }, 2000);
});