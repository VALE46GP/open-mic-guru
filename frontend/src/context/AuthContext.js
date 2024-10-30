import React, { createContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    const login = (token) => {
        if (!token) return;
        Cookies.set('token', token, { expires: 7 });
        setIsAuthenticated(true);
        fetchUserDetails(token);
    };

    const fetchUserDetails = async (token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId;
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();

            if (data.user) {
                setUser(data.user);
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };

    const logout = () => {
        Cookies.remove('token');
        setIsAuthenticated(false);
        setUser(null);
    };

    useEffect(() => {
        const token = Cookies.get('token');
        if (token) {
            setIsAuthenticated(true);
            fetchUserDetails(token);
        }
    }, []);

    const getUserId = () => {
        return user ? user.id : null;
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, getUserId, user }}>
            {children}
        </AuthContext.Provider>
    );
};
