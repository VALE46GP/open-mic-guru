import React from 'react';
import BorderBox from '../shared/BorderBox/BorderBox';
import { Link } from 'react-router-dom';
import './EventCard.sass';

function EventCard({ event, slotTime }) {
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
                <BorderBox className="event-card">
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
                        <div
                            className={`event-card__details ${event.event_image ? 'event-card__details--with-image' : ''}`}>
                            <div className="event-card__title">
                                {event.event_name}
                            </div>
                            <span className="event-card__meta-item">
                                {event.venue_name || 'Unknown Venue'}
                            </span>
                            <span className="event-card__meta-item">
                                {new Date(event.start_time).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                })}
                            </span>
                            <span className="event-card__meta-item">
                                Hosted by: {event.host_name}
                            </span>
                            {slotTime && (
                                <span className="event-card__meta-item event-card__slot-time">
                                    Slot time: {new Date(slotTime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
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
