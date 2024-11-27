import '@testing-library/jest-dom';
import fetchMock from 'jest-fetch-mock';
import { TextEncoder, TextDecoder } from 'util';

// Setup fetch mock
fetchMock.enableMocks();

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.alert
global.alert = jest.fn();

// Mock Google Maps
global.google = {
    maps: {
        LatLng: jest.fn(function(lat, lng) {
            return { lat, lng };
        }),
        LatLngBounds: jest.fn(function() {
            return {
                extend: jest.fn(),
                contains: jest.fn(() => true),
                getSouthWest: jest.fn(),
                getNorthEast: jest.fn()
            };
        }),
        Marker: jest.fn(),
        Map: jest.fn(),
        Geocoder: jest.fn(),
        places: {
            Autocomplete: jest.fn()
        },
        geometry: {
            spherical: {
                computeDistanceBetween: jest.fn(() => 1000)
            }
        }
    }
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
};
