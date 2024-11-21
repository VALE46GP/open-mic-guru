import React from 'react';
import { Link } from 'react-router-dom';
import BorderBox from '../shared/BorderBox/BorderBox';
import './UserCard.sass';
import { socialMediaPlatforms } from '../utils/socialMediaPlatforms';

function UserCard({ user }) {
    const roles = user.roles || [];
    console.log('User:', user.id);
    console.log('User roles:', roles);
    console.log('--------------------------------');
    const hasHostRole = roles.includes('host');
    const hasPerformerRole = user.is_performer;

    const getPlatformIcon = (platformName) => {
        const platform = socialMediaPlatforms.find((p) => p.name === platformName);
        return platform ? platform.icon : null;
    };

    return (
        <Link to={`/users/${user.id}`} className="user-card__link">
            <div className="user-card__wrapper">
                {(hasHostRole || hasPerformerRole) && (
                    <div className="user-card__role">
                        {hasHostRole && <span className="user-card__role-badge host">Host</span>}
                        {hasPerformerRole &&
                            <span className="user-card__role-badge performer">Performer</span>}
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
