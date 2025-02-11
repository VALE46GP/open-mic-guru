import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import '@testing-library/jest-dom';
import { BASE_URL } from './config';

// Properly mock console methods
const originalConsole = { ...console };

beforeEach(() => {
    console.log = jest.fn((message) => {
        if (message?.includes('Loading Google Maps API')) return;
        originalConsole.log(message);
    });

    console.error = jest.fn((message) => {
        if (
            message?.includes('Error fetching events') ||
            message?.includes('Error fetching notifications')
        ) return;
        originalConsole.error(message);
    });
});

afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
});

beforeAll(() => {
    global.fetch = jest.fn((url) => {
        if (url.includes(`${BASE_URL}events`)) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        data: {
                            events: [
                                {
                                    event_id: 1,
                                    event_name: 'Event 1',
                                    venue_name: 'Venue 1',
                                    start_time: new Date().toISOString(),
                                },
                            ],
                        },
                    }),
            });
        }

        if (url.includes(`${BASE_URL}/notifications`)) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve([
                        { id: 1, message: 'Notification 1', is_read: false },
                        { id: 2, message: 'Notification 2', is_read: true },
                    ]),
            });
        }

        return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ message: 'Not Found' }),
        });
    });
});

afterAll(() => {
    global.fetch.mockClear();
});

const renderWithRouter = async (initialEntry = '/') => {
    const utils = render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <App />
        </MemoryRouter>
    );
    await waitFor(() => screen.getByTestId('app-container'));
    return utils;
};

describe('App Component', () => {
    it('renders the app container', async () => {
        await renderWithRouter();
        const appContainer = screen.getByTestId('app-container');
        expect(appContainer).toBeInTheDocument();
    });

    it('renders the navigation component', async () => {
        await renderWithRouter();
        const navElement = screen.getByRole('navigation');
        expect(navElement).toBeInTheDocument();
    });

    it('renders the EventsPage by default ("/" route)', async () => {
        await renderWithRouter('/');
        const eventsTitle = await screen.findByRole('heading', { name: /upcoming events/i });
        expect(eventsTitle).toBeInTheDocument();
    });

    it('renders the LoginPage on "/login" route', async () => {
        await renderWithRouter('/login');
        const loginHeading = await screen.findByRole('heading', { name: /login existing user/i });
        expect(loginHeading).toBeInTheDocument();
    });

    it('renders a Not Found page for an unknown route', async () => {
        await renderWithRouter('/unknown-route');
        const notFoundHeading = await screen.findByRole('heading', { name: /page not found/i });
        expect(notFoundHeading).toBeInTheDocument();
    });
});