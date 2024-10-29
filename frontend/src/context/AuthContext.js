import React, { createContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userName, setUserName] = useState('');

    const login = (token) => {
        if (!token) return;  // Avoid calling fetchUserDetails if no token is provided
        Cookies.set('token', token, { expires: 7 });
        setIsAuthenticated(true);
        fetchUserDetails(token);
    };

    const fetchUserDetails = async (token) => {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (data.user && data.user.name) {
            setUserName(data.user.name);
        }
    };

    const logout = () => {
        Cookies.remove('token');
        setIsAuthenticated(false);
        setUserName('');
    };

    useEffect(() => {
        const token = Cookies.get('token');
        if (token) {
            setIsAuthenticated(true);
            fetchUserDetails(token);
        }
    }, []);

    const getUserId = () => {
        const token = Cookies.get('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, getUserId, userName }}>
            {children}
        </AuthContext.Provider>
    );
};
