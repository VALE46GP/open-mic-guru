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
    const hasPerformerRole = roles.includes('performer');

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
                        {hasPerformerRole && <span className="user-card__role-badge performer">Performer</span>}
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
                        <div className={`user-card__details ${user.image ? 'user-card__details--with-image' : ''}`}>
                            <div className="user-card__title">
                                {user.name}
                            </div>
                            {user.social_media_accounts && user.social_media_accounts.length > 0 && (
                                <div className="user-card__social-media">
                                    {user.social_media_accounts.map((account, index) => {
                                        const IconComponent = getPlatformIcon(account.platform);
                                        return (
                                            <a key={index} href={account.url} target="_blank" rel="noopener noreferrer">
                                                {IconComponent && <IconComponent className="user-card__social-media-icon" />}
                                            </a>
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
