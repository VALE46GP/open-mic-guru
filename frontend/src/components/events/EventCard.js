import React, { useState, useEffect } from 'react';
import { formatEventTimeInVenueTimezone, formatTimeComparison, formatPerformerTime } from '../../utils/timeCalculations';
import BorderBox from '../shared/BorderBox/BorderBox';
import { Link, useNavigate } from 'react-router-dom';
import './EventCard.sass';

function EventCard({ event, slotTime, compact, showDeleted = false }) {
    const navigate = useNavigate();
    const [formattedEventTime, setFormattedEventTime] = useState('');
    const [formattedSlotTime, setFormattedSlotTime] = useState('');

    useEffect(() => {
        async function formatTimes() {
            try {
                const formattedStartTime = formatEventTimeInVenueTimezone(
                    event.start_time, 
                    { utc_offset: event.venue_utc_offset ?? -420 }
                );
                setFormattedEventTime(formattedStartTime);

                if (slotTime) {
                    const formattedSlotTime = formatPerformerTime(
                        event.start_time,
                        slotTime,
                        event.venue_utc_offset ?? -420
                    );
                    setFormattedSlotTime(formattedSlotTime);
                }
            } catch (error) {
                console.error('Error formatting times:', error);
            }
        }

        formatTimes();
    }, [event, slotTime]);

    if (event.deleted && !showDeleted) {
        return null;
    }

    const handleClick = (e) => {
        if (event.deleted) {
            e.preventDefault();
            return;
        }
        navigate(`/events/${event.event_id}`);
    };

    const cardContent = (
        <div className="event-card__wrapper">
            {(event.is_host || event.is_performer) && (
                <div className="event-card__role">
                    {event.is_host && <span className="event-card__role-badge event-card__role-badge--host">Host</span>}
                    {event.is_performer &&
                        <span className="event-card__role-badge event-card__role-badge--performer">Performer</span>}
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
                            <p>
                                <span className="event-card__meta-item">Performance Time: </span>
                                <span className="event-card__slot-time">
                                    {formattedSlotTime}
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            </BorderBox>
        </div>
    );

    if (event.deleted) {
        return <div className="event-card">{cardContent}</div>;
    }

    return (
        <Link to={`/events/${event.event_id}`} className="event-card__link">
            {cardContent}
        </Link>
    );
}

export default EventCard;
