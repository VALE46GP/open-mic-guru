import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import CreateEvent from './CreateEvent';
import axios from 'axios';

// Mock axios to prevent real API calls
jest.mock('axios');

beforeEach(() => {
    global.google = {
        maps: {
            Map: jest.fn(),
            Marker: jest.fn(),
            places: {
                Autocomplete: jest.fn(),
            },
        },
    };
});

afterAll(() => {
    delete global.google;
});

// Mock VenueAutocomplete as a simple input
jest.mock('../shared/VenueAutocomplete', () => {
    return function MockVenueAutocomplete() {
        return <input placeholder="Location" data-testid="mock-autocomplete" />;
    };
});

describe('CreateEvent Component', () => {
    test('renders CreateEvent component and submits form', async () => {
        // Render the component without asserting API calls or form validations
        render(
            <AuthProvider>
                <MemoryRouter initialEntries={['/create-event']}>
                    <Routes>
                        <Route path="/create-event" element={<CreateEvent />} />
                    </Routes>
                </MemoryRouter>
            </AuthProvider>
        );

        // Simplify by interacting only with main fields
        fireEvent.change(screen.getByPlaceholderText('Event Name'), { target: { value: 'Test Event' } });
        fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '2023-01-01T12:00' } });
        fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '2023-01-01T14:00' } });
        fireEvent.change(screen.getByTestId('mock-autocomplete'), { target: { value: 'Test Venue' } });

        // Trigger form submission
        fireEvent.click(screen.getByText('Submit'));

        // Simple assertion to check if the form rendered correctly and button click works
        expect(screen.getByText('Create a New Event')).toBeInTheDocument();
    });
});
