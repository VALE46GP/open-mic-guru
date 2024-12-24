export const mockVenues = [
  {
    venue_id: 1,
    name: 'Test Venue 1',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    latitude: 40.7128,
    longitude: -74.0060
  },
  {
    venue_id: 2,
    name: 'Test Venue 2',
    address: '456 Mock Ave',
    city: 'Mock City',
    state: 'MC',
    zip: '67890',
    latitude: 34.0522,
    longitude: -118.2437
  }
];

export const mockPlaceData = {
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
    { short_name: '123', types: ['street_number'] },
    { short_name: 'Test St', types: ['route'] },
    { short_name: 'Test City', types: ['locality'] }
  ],
  utc_offset_minutes: -480 // Pacific Time
};

export const mockVenue = {
  name: 'Test Venue',
  address: '123 Test St',
  formatted_address: '123 Test St',
  geometry: {
    location: {
      lat: () => 40.7128,
      lng: () => -74.0060
    }
  },
  timezone: 'America/Los_Angeles',
  latitude: 40.7128,
  longitude: -74.0060,
  address_components: [
    { short_name: '123', types: ['street_number'] },
    { short_name: 'Test St', types: ['route'] }
  ]
};
