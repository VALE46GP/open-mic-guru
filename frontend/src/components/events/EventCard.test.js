import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../testUtils/testUtils';
import EventCard from './EventCard';
import { mockEvents } from '../../testData/mockEvents';

// Mock the time formatting utilities
jest.mock('../../utils/timeCalculations', () => ({
  formatEventTimeInVenueTimezone: jest.fn().mockReturnValue('Feb 1, 2024 1:00 AM'),
  formatTimeComparison: jest.fn(),
  formatPerformerTime: jest.fn()
}));

const mockEvent = {
  event_id: mockEvents[0].event_id,
  event_name: mockEvents[0].event_name,
  event_image: mockEvents[0].event_image,
  start_time: mockEvents[0].start_time,
  venue_name: 'Test Venue',
  venue_utc_offset: -420,
  host_name: 'testhost',
  event_types: mockEvents[0].event_types,
  active: true,
  is_host: true
};

describe('EventCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders basic event details correctly', () => {
      renderWithProviders(<EventCard event={mockEvent} />);
      
      // Test event name
      expect(screen.getByText(mockEvent.event_name)).toBeInTheDocument();
      
      // Test venue name
      expect(screen.getByText(mockEvent.venue_name)).toBeInTheDocument();
      
      // Test event type (capitalize first letter)
      const eventType = mockEvent.event_types[0].charAt(0).toUpperCase() + 
        mockEvent.event_types[0].slice(1);
      expect(screen.getByText(eventType)).toBeInTheDocument();
      
      // Test host info
      expect(screen.getByText(/Hosted by:/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(mockEvent.host_name))).toBeInTheDocument();
    });

    test('renders event image with correct alt text', () => {
      renderWithProviders(<EventCard event={mockEvent} />);
      
      const image = screen.getByAltText(mockEvent.event_name);
      expect(image).toHaveAttribute('src', mockEvent.event_image);
      expect(image).toHaveClass('event-card__image');
    });

    test('renders cancelled status when event is inactive', () => {
      const inactiveEvent = { ...mockEvent, active: false };
      renderWithProviders(<EventCard event={inactiveEvent} />);
      
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    test('renders host badge when user is host', () => {
      renderWithProviders(<EventCard event={mockEvent} />);
      
      expect(screen.getByText('Host')).toBeInTheDocument();
    });

    test('renders performer badge when user is performer', () => {
      const performerEvent = { ...mockEvent, is_host: false, is_performer: true };
      renderWithProviders(<EventCard event={performerEvent} />);
      
      expect(screen.getByText('Performer')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('has correct link to event page', () => {
      renderWithProviders(<EventCard event={mockEvent} />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', `/events/${mockEvent.event_id}`);
    });
  });

  describe('Performance Time', () => {
    test('displays slot time when provided', () => {
      const slotTime = '2024-02-01T08:30:00Z';
      renderWithProviders(<EventCard event={mockEvent} slotTime={slotTime} />);
      
      expect(screen.getByText('Performance Time:')).toBeInTheDocument();
    });

    test('does not display slot time when not provided', () => {
      renderWithProviders(<EventCard event={mockEvent} />);
      
      expect(screen.queryByText('Performance Time:')).not.toBeInTheDocument();
    });
  });

  describe('Deleted Events', () => {
    test('does not render when event is deleted and showDeleted is false', () => {
      const deletedEvent = { ...mockEvent, deleted: true };
      const { container } = renderWithProviders(
        <EventCard event={deletedEvent} showDeleted={false} />
      );
      
      expect(container.firstChild).toBeNull();
    });

    test('renders when event is deleted and showDeleted is true', () => {
      const deletedEvent = { ...mockEvent, deleted: true };
      renderWithProviders(
        <EventCard event={deletedEvent} showDeleted={true} />
      );
      
      expect(screen.getByText(deletedEvent.event_name)).toBeInTheDocument();
    });
  });
});
