import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EventCard from '../../components/events/EventCard';
import EventsMap from '../../components/events/EventsMap';
import VenueAutocomplete from '../../components/shared/VenueAutocomplete';
import EventSearch from '../../components/shared/EventSearch';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './EventsPage.sass';
import { Link, useNavigate } from 'react-router-dom';
import { useWebSocketContext } from '../../context/WebSocketContext';

const EVENT_TYPE_OPTIONS = [
    { label: 'Music', value: 'music' },
    { label: 'Comedy', value: 'comedy' },
    { label: 'Spoken Word', value: 'spoken_word' },
    { label: 'Other', value: 'other' }
];

const EventsPage = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState(null);
    const [selectedEvents, setSelectedEvents] = useState([]);
    const [showPastEvents, setShowPastEvents] = useState(false);
    const { getUserId } = useAuth();
    const userId = getUserId();
    const navigate = useNavigate();
    const { lastMessage } = useWebSocketContext();
    const [selectedEventTypes, setSelectedEventTypes] = useState([]);
    const [showTypeFilter, setShowTypeFilter] = useState(false);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch('/api/events');
                if (!response.ok) {
                    throw new Error('Failed to fetch events');
                }
                const eventsData = await response.json();

                const processedEvents = eventsData.map(event => ({
                    ...event,
                    is_host: userId ? event.host_id === userId : false,
                    is_performer: userId ? event.performers?.includes(userId) : false,
                    active: event.active === undefined ? true : event.active
                }));

                const sortedEvents = processedEvents.sort(
                    (a, b) => new Date(a.start_time) - new Date(b.start_time)
                );

                setEvents(sortedEvents);
                setFilteredEvents(sortedEvents);
            } catch (error) {
                console.error('Error fetching events:', error);
            }
        };

        fetchEvents();
    }, [userId]);

    useEffect(() => {
        if (!lastMessage) return;

        try {
            const update = JSON.parse(lastMessage.data);
            console.log('Received WebSocket update:', update);
            
            if (update.type === 'EVENT_UPDATE') {
                setEvents(prevEvents => {
                    return prevEvents.map(event => {
                        if (event.event_id === update.eventId) {
                            return {
                                ...event,
                                ...update.data,
                                // Preserve existing fields that might not be in the update
                                event_id: event.event_id,
                                is_host: event.is_host,
                                is_performer: event.is_performer,
                                active: update.data.active !== undefined ? update.data.active : event.active
                            };
                        }
                        return event;
                    });
                });

                // Also update filtered events
                setFilteredEvents(prevFiltered => {
                    return prevFiltered.map(event => {
                        if (event.event_id === update.eventId) {
                            return {
                                ...event,
                                ...update.data,
                                event_id: event.event_id,
                                is_host: event.is_host,
                                is_performer: event.is_performer,
                                active: update.data.active !== undefined ? update.data.active : event.active
                            };
                        }
                        return event;
                    });
                });
            }
        } catch (err) {
            console.error('Error processing WebSocket message:', err);
        }
        console.log('Last WebSocket message:', lastMessage);
    }, [lastMessage]);

    useEffect(() => {
        setFilteredEvents(filterEvents(events, searchTerm, selectedLocation));
    }, [selectedEventTypes, events, searchTerm, selectedLocation]);

    const filterEvents = (events, searchTerm, location) => {
        let filtered = [...events];

        // Event type filtering
        if (selectedEventTypes.length > 0) {
            filtered = filtered.filter(event => 
                event.event_types?.some(eventType => 
                    selectedEventTypes.includes(eventType)
                )
            );
        }

        // Search filtering
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(event =>
                (event.event_name?.toLowerCase().includes(searchLower) || '') ||
                (event.venue_name?.toLowerCase().includes(searchLower) || '') ||
                (event.host_name?.toLowerCase().includes(searchLower) || '')
            );
        }

        // Location filtering
        if (location) {
            const isSpecificLocation = location.address_components?.some(component =>
                ['street_number', 'route', 'postal_code'].includes(component.types[0])
            );

            if (isSpecificLocation && location.lat && location.lng) {
                filtered = filtered.filter(event => {
                    if (!event.venue_latitude || !event.venue_longitude) return false;

                    const eventLocation = new window.google.maps.LatLng(
                        Number(event.venue_latitude),
                        Number(event.venue_longitude)
                    );

                    const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
                        new window.google.maps.LatLng(location.lat, location.lng),
                        eventLocation
                    );

                    return distance <= 16093.33;
                });
            } else if (location.viewport && Object.keys(location.viewport).length > 0) {
                const bounds = new window.google.maps.LatLngBounds(
                    location.viewport.getSouthWest(),
                    location.viewport.getNorthEast()
                );

                filtered = filtered.filter(event => {
                    if (!event.venue_latitude || !event.venue_longitude) return false;

                    const eventLocation = new window.google.maps.LatLng(
                        Number(event.venue_latitude),
                        Number(event.venue_longitude)
                    );

                    return bounds.contains(eventLocation);
                });
            }
        }

        return filtered;
    };

    const handleSearch = searchTerm => {
        setSearchTerm(searchTerm);
        setSelectedEvents([]);
        setFilteredEvents(filterEvents(events, searchTerm, selectedLocation));
    };

    const handleLocationSelected = place => {
        if (!place || !place.geometry) return;

        const location = {
            lat: typeof place.geometry.location.lat === 'function'
                ? place.geometry.location.lat()
                : place.geometry.location.lat,
            lng: typeof place.geometry.location.lng === 'function'
                ? place.geometry.location.lng()
                : place.geometry.location.lng,
            address_components: place.address_components,
            viewport: place.geometry.viewport,
        };

        setSelectedLocation(location);
        setMapCenter({ lat: location.lat, lng: location.lng });
        setFilteredEvents(filterEvents(events, searchTerm, location));
    };

    const handleEventSelect = selectedEvents => {
        setSelectedEvents(selectedEvents);
    };

    const futureEvents = filteredEvents.filter(event => new Date(event.start_time) >= new Date());
    const pastEvents = filteredEvents
        .filter(event => new Date(event.start_time) < new Date())
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

    const handleEventTypeChange = (value) => {
        setSelectedEventTypes(prev => {
            if (prev.includes(value)) {
                return prev.filter(t => t !== value);
            } else {
                return [...prev, value];
            }
        });
    };

    return (
        <div className="events-page">
            <BorderBox className="events-page__border-box">
                <div className="events-page__map-section">
                    <div className="events-page__button-row">
                        <button
                            className="events-page__button"
                            onClick={() => {
                                if (showTypeFilter) {
                                    setSelectedEventTypes([]);
                                    setShowTypeFilter(false);
                                } else {
                                    setShowTypeFilter(true);
                                }
                            }}
                        >
                            {showTypeFilter ? "All Types" : "Filter by Type"}
                        </button>
                        <button
                            className="events-page__button"
                            onClick={() => setShowPastEvents(!showPastEvents)}
                        >
                            {showPastEvents ? "Hide Past Events" : "Show Past Events"}
                        </button>
                    </div>
                    {showTypeFilter && (
                        <div className="events-page__checkboxes">
                            {EVENT_TYPE_OPTIONS.map(option => (
                                <div key={option.value} className="events-page__checkbox-group">
                                    <label className="events-page__checkbox-label">
                                        <input
                                            type="checkbox"
                                            className="events-page__checkbox"
                                            checked={selectedEventTypes.includes(option.value)}
                                            onChange={() => handleEventTypeChange(option.value)}
                                        />
                                        {option.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    <VenueAutocomplete
                        onPlaceSelected={handleLocationSelected}
                        onClear={() => {
                            setSelectedLocation(null);
                            setMapCenter(null);
                            setFilteredEvents(events);
                        }}
                    />
                    <EventSearch
                        onSearch={handleSearch}
                        onClear={() => {
                            setSearchTerm('');
                            setFilteredEvents(filterEvents(events, '', selectedLocation));
                        }}
                    />
                    <EventsMap
                        events={showPastEvents ? filteredEvents : futureEvents}
                        userId={userId}
                        center={mapCenter}
                        onEventSelect={handleEventSelect}
                        />
                    {selectedEvents.length > 0 && (
                        <div className="events-page__selected-events">
                            {selectedEvents.map(event => (
                                <EventCard
                                    key={`selected-${event.event_id}`}
                                    event={event}
                                    slotTime={event.is_performer ? event.performer_slot_time : null}
                                    compact
                                    onClick={() => navigate(`/events/${event.event_id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </BorderBox>
            <h2 className="events-page__title">Upcoming Events</h2>
            <div className="events-page__grid">
                {futureEvents.length > 0 ? (
                    futureEvents.map(event => (
                        <EventCard
                            key={`event-${event.event_id}`}
                            event={event}
                            slotTime={event.is_performer ? event.performer_slot_time : null}
                        />
                    ))
                ) : (
                    <div className="events-page__no-events">
                        <p>No upcoming events found</p>
                    </div>
                )}
            </div>
            {showPastEvents && (
                <>
                    <h2 className="events-page__title">Past Events</h2>
                    <div className="events-page__grid">
                        {pastEvents.map(event => (
                            <EventCard
                                key={`event-${event.event_id}`}
                                event={event}
                                slotTime={event.is_performer ? event.performer_slot_time : null}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default EventsPage;