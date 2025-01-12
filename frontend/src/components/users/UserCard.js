import React from 'react';
import { Link } from 'react-router-dom';
import BorderBox from '../shared/BorderBox/BorderBox';
import './UserCard.sass';
import { socialMediaPlatforms } from '../utils/socialMediaPlatforms';

function UserCard({ user }) {
    const getPlatformIcon = (platformName) => {
        const platform = socialMediaPlatforms.find((p) => p.name === platformName);
        return platform ? platform.icon : null;
    };

    const uniqueEventTypes = user.event_types || [];

    return (
        <Link to={`/users/${user.id}`} className="user-card__link">
            <div className="user-card__wrapper">
                {(user.is_host || user.is_performer) && (
                    <div className="user-card__role">
                        {user.is_host && <span className="user-card__role-badge user-card__role-badge--host">Host</span>}
                        {user.is_performer &&
                            <span className="user-card__role-badge user-card__role-badge--performer">Performer</span>}
                    </div>
                )}
                <BorderBox className="user-card">
                    <div className="user-card__content">
                        {user.image && (
                            <div className="user-card__image-container">
                                <img
                                    src={user.image}
                                    alt={`${user.name}'s profile`}
                                    className="user-card__image"
                                />
                            </div>
                        )}
                        <div
                            className={`user-card__details ${user.image ? 'user-card__details--with-image' : ''}`}>
                            <div className="user-card__name">
                                {user.name}
                            </div>
                            {uniqueEventTypes.length > 0 && (
                                <div className="user-card__event-types">
                                    {uniqueEventTypes.map(type => (
                                        <span key={type} className="user-card__event-type">
                                            {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {user.social_media_accounts && user.social_media_accounts.length > 0 && (
                                <div className="user-card__social-media">
                                    {user.social_media_accounts.map((account, index) => {
                                        const IconComponent = getPlatformIcon(account.platform);
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => window.open(account.url, '_blank')}
                                                className="user-card__social-media-button"
                                                aria-label={`Visit ${account.platform}`}
                                            >
                                                {IconComponent && <IconComponent
                                                    className="user-card__social-media-icon"/>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </BorderBox>
            </div>
        </Link>
    );
}

export default UserCard;
