import React from 'react';
import { Link } from 'react-router-dom';
import BorderBox from '../shared/BorderBox/BorderBox';
import './UserCard.sass';

function UserCard({ user }) {
    const roles = user.roles || [];
    console.log('User:', user.id);
    console.log('User roles:', roles);
    console.log('--------------------------------');
    const hasHostRole = roles.includes('host');
    const hasPerformerRole = roles.includes('performer');

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
                        </div>
                    </div>
                </BorderBox>
            </div>
        </Link>
    );
}

export default UserCard;
