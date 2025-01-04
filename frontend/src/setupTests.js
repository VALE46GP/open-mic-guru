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

// Mock Google Maps API
window.google = {
    maps: {
        Map: jest.fn().mockImplementation((container, options) => ({
            setCenter: jest.fn(),
            setZoom: jest.fn(),
            setOptions: jest.fn(),
            fitBounds: jest.fn(),
            getCenter: jest.fn().mockReturnValue({ lat: () => 0, lng: () => 0 }),
            getZoom: jest.fn().mockReturnValue(10),
            addListener: jest.fn(),
            isMarkerClick: false
        })),
        places: {
            Autocomplete: function() {
                return {
                    addListener: (event, callback) => {
                        if (event === 'place_changed') {
                            setTimeout(callback, 0);
                        }
                    },
                    getPlace: () => ({
                        geometry: {
                            location: {
                                lat: () => 40.7128,
                                lng: () => -74.0060
                            }
                        },
                        name: 'Test Venue',
                        formatted_address: '123 Test St, Test City',
                        address_components: [
                            { short_name: '123', types: ['street_number'] },
                            { short_name: 'Test St', types: ['route'] },
                            { short_name: 'Test City', types: ['locality'] }
                        ],
                        utc_offset_minutes: -480
                    }),
                    setComponentRestrictions: jest.fn(),
                    setFields: jest.fn(),
                    setTypes: jest.fn()
                };
            }
        },
        event: {
            clearInstanceListeners: jest.fn()
        },
        Marker: jest.fn().mockImplementation(() => ({
            setMap: jest.fn(),
            addListener: jest.fn(),
            getPosition: jest.fn().mockReturnValue({ lat: () => 0, lng: () => 0 })
        })),
        LatLng: jest.fn((lat, lng) => ({ lat, lng })),
        LatLngBounds: jest.fn(() => ({
            extend: jest.fn(),
            contains: jest.fn(() => true)
        }))
    }
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
};
