import React, { createContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Function to set the token in local storage and update state
    const login = (token) => {
        Cookies.set('token', token, { expires: 7 }); // Set a cookie for 7 days
        setIsAuthenticated(true);
    };

    // Function to clear the token from local storage and update state
    const logout = () => {
        Cookies.remove('token');
        setIsAuthenticated(false);
    };

    useEffect(() => {
        const token = Cookies.get('token');
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    // Add a method to get the user's ID
    const getUserId = () => {
        const token = Cookies.get('token');
        // Assuming the token is a JWT and contains the user ID in its payload
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, getUserId }}>
            {children}
        </AuthContext.Provider>
    );
};
