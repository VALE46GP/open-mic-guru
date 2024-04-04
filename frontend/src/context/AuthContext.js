import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Function to set the token in local storage and update state
    const login = (token) => {
        localStorage.setItem('token', token);
        setIsAuthenticated(true);
    };

    // Function to clear the token from local storage and update state
    const logout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
    };

    // Add a method to get the user's ID
    const getUserId = () => {
        const token = localStorage.getItem('token');
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
