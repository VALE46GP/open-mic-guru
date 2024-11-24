import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FaPlus, FaSignInAlt, FaCalendarAlt, FaUsers } from 'react-icons/fa';
import NotificationIndicator from './NotificationIndicator';
import './Navigation.sass';

const Navigation = () => {
    const { isAuthenticated, user } = useAuth();
    const [isVisible, setIsVisible] = useState(true);
    const defaultImageUrl = 'https://open-mic-guru.s3.us-west-1.amazonaws.com/users/user-default.jpg';

    useEffect(() => {
        let lastScrollTop = 0;
        const handleScroll = () => {
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (currentScrollTop > lastScrollTop) {
                setIsVisible(false); // Scrolling down
            } else {
                setIsVisible(true); // Scrolling up
            }
            lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop; // For Mobile or negative scrolling
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <div className="navigation__placeholder"></div>
            <nav
                className={`navigation ${isVisible ? 'navigation--visible' : 'navigation--hidden'}`}>
                <div className="navigation__left">
                    <Link to="/" className="navigation__logo">
                        <FaCalendarAlt/>
                    </Link>
                </div>
                <div className="navigation__right">
                    <Link to="/users" className="navigation__users-link">
                        <FaUsers/>
                    </Link>
                    {isAuthenticated && user ? (
                        <div className="navigation__right">
                            <Link to="/create-event" className="navigation__create-event">
                                <FaPlus/>
                            </Link>
                            <NotificationIndicator />
                            <Link to={`/users/${user.id}`}>
                                <img
                                    src={user.image || defaultImageUrl}
                                    alt="User Thumbnail"
                                    className="navigation__user-thumbnail"
                                />
                            </Link>
                        </div>
                    ) : (
                        <Link to="/login" className="navigation__login-icon">
                            <FaSignInAlt/>
                        </Link>
                    )}
                </div>
            </nav>
        </>
    );
};

export default Navigation;
