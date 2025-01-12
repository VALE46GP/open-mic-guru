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

describe('CreateEvent', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn((url, options) => {
            if (url.includes('/venues/checkOrCreate')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ venueId: 1 })
                });
            }
            if (url.includes('/events')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ id: 1 })
                });
            }
            return Promise.reject(new Error('Unhandled request'));
        });
        mockNavigate.mockClear();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('creates event successfully', async () => {
        render(
            <MemoryRouter>
                <AuthProvider>
                    <CreateEvent />
                </AuthProvider>
            </MemoryRouter>
        );

        // Select venue
        await act(async () => {
            fireEvent.click(screen.getByTestId('mock-venue-select'));
        });

        // Fill form fields
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
            fireEvent.change(screen.getByLabelText(/performance duration/i), {
                target: { value: '10' }
            });
            fireEvent.change(screen.getByLabelText(/setup duration/i), {
                target: { value: '5' }
            });
        });

        // Select event type
        const musicCheckbox = screen.getByLabelText(/music/i);
        await act(async () => {
            fireEvent.click(musicCheckbox);
        });

        // Submit form
        await act(async () => {
            fireEvent.click(screen.getByText(/submit/i));
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/events'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
            expect(mockNavigate).toHaveBeenCalledWith('/events/1');
        });
    });
});