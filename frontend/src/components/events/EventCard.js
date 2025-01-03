import React, { useState, useEffect } from 'react';
import { formatEventTimeInVenueTimezone } from '../../utils/timeCalculations';
import BorderBox from '../shared/BorderBox/BorderBox';
import { Link } from 'react-router-dom';
import './EventCard.sass';

function EventCard({ event, slotTime }) {
    const [formattedEventTime, setFormattedEventTime] = useState('');
    const [formattedSlotTime, setFormattedSlotTime] = useState('');

    useEffect(() => {
        async function formatTimes() {
            if (event?.start_time) {
                const venue = {
                    latitude: event.venue_latitude,
                    longitude: event.venue_longitude
                };
                const formatted = await formatEventTimeInVenueTimezone(
                    event.start_time,
                    venue,
                    'MMM d, h:mm aa'
                );
                setFormattedEventTime(formatted);
            }

            if (slotTime) {
                const venue = {
                    latitude: event.venue_latitude,
                    longitude: event.venue_longitude
                };
                const formatted = await formatEventTimeInVenueTimezone(
                    slotTime,
                    venue,
                    'h:mm aa'
                );
                setFormattedSlotTime(formatted);
            }
        }

        formatTimes();
    }, [event, slotTime]);

    return (
        <Link to={`/events/${event.event_id}`} className="event-card__link">
            <div className="event-card__wrapper">
                {(event.is_host || event.is_performer) && (
                    <div className="event-card__role">
                        {event.is_host && <span className="event-card__role-badge host">Host</span>}
                        {event.is_performer &&
                            <span className="event-card__role-badge performer">Performer</span>}
                    </div>
                )}
                <BorderBox className={`event-card ${!event.active ? 'event-card--cancelled' : ''}`}>
                    <div className="event-card__content">
                        {event.event_image && (
                            <div className="event-card__image-container">
                                <img
                                    src={event.event_image}
                                    alt={`${event.event_name} image`}
                                    className="event-card__image"
                                />
                            </div>
                        )}
                        <div className={`event-card__details ${event.event_image ? 'event-card__details--with-image' : ''}`}>
                            {!event.active && (
                                <div className="event-card__status-banner">
                                    Cancelled
                                </div>
                            )}
                            <div className="event-card__title">
                                {event.event_name}
                            </div>
                            {event.event_types && event.event_types.length > 0 && (
                                <span className="event-card__meta-item event-card__meta-item--type">
                                    {event.event_types.map(type =>
                                        type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
                                    ).join(', ')}
                                </span>
                            )}
                            <span className="event-card__meta-item">
                                {event.venue_name || 'Unknown Venue'}
                            </span>
                            <span className="event-card__meta-item">
                                {formattedEventTime}
                            </span>
                            <span className="event-card__meta-item">
                                Hosted by: {event.host_name}
                            </span>
                            {slotTime && (
                                <span className="event-card__slot-time">
                                    {formattedSlotTime}
                                </span>
                            )}
                        </div>
                    </div>
                </BorderBox>
            </div>
        </Link>
    );
}

export default EventCard;
