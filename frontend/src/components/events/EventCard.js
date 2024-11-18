import React from 'react';
import { Link } from 'react-router-dom';
import BorderBox from '../shared/BorderBox/BorderBox';
import './EventCard.sass';

function EventCard({ event, slotTime }) {
    return (
        <div className="event-card__wrapper">
            {(event.is_host || event.is_performer) && (
                <div className="event-card__role">
                    {event.is_host && <span className="event-card__role-badge host">Host</span>}
                    {event.is_performer && <span className="event-card__role-badge performer">Performer</span>}
                </div>
            )}
            <BorderBox className="event-card">
                <Link to={`/events/${event.event_id}`} className="event-card__title">
                    {event.event_name}
                </Link>
                
                <div className="event-card__meta">
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
                </div>
                <div className="event-card__meta">
                    <span className="event-card__meta-item">
                        Hosted by: <Link to={`/users/${event.host_id}`} className="event-card__host-link">
                            {event.host_name}
                        </Link>
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
            </BorderBox>
        </div>
    );
}

export default EventCard;
