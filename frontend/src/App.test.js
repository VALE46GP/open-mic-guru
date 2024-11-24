import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import '@testing-library/jest-dom';

beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation((message) => {
        if (message.includes('Loading Google Maps API')) {
            return;
        }
        console.log(message);
    });

    jest.spyOn(console, 'error').mockImplementation((message) => {
        if (
            message.includes('Error fetching events') ||
            message.includes('Error fetching notifications')
        ) {
            return;
        }
        console.error(message);
    });
});

afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
});

beforeAll(() => {
    global.fetch = jest.fn((url) => {
        if (url.includes('/api/events')) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve([
                        {
                            event_id: 1,
                            event_name: 'Event 1',
                            venue_name: 'Venue 1',
                            start_time: new Date().toISOString(),
                        },
                    ]),
            });
        }

        if (url.includes('/api/notifications')) {
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

describe('App Component', () => {
    it('renders the app container', () => {
        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        );

        const appContainer = screen.getByTestId('app-container');
        expect(appContainer).toBeInTheDocument();
    });

    it('renders the navigation component', () => {
        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        );

        const navElement = screen.getByRole('navigation');
        expect(navElement).toBeInTheDocument();
    });

    it('renders the EventsPage by default ("/" route)', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );

        const eventsTitle = screen.getByRole('heading', { name: /upcoming events/i });
        expect(eventsTitle).toBeInTheDocument();
    });

    it('renders the LoginPage on "/login" route', () => {
        render(
            <MemoryRouter initialEntries={['/login']}>
                <App />
            </MemoryRouter>
        );

        const loginHeading = screen.getByRole('heading', { name: /login existing user/i });
        expect(loginHeading).toBeInTheDocument();
    });

    it('renders a Not Found page for an unknown route', () => {
        render(
            <MemoryRouter initialEntries={['/unknown-route']}>
                <App />
            </MemoryRouter>
        );

        const notFoundHeading = screen.getByRole('heading', { name: /page not found/i });
        expect(notFoundHeading).toBeInTheDocument();
    });
});