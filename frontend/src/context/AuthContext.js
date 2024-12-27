import React, { createContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    // Login function: stores the token in cookies and fetches user details
    const login = (token) => {
        if (!token) return;

        // Save the token in cookies (7-day expiration)
        Cookies.set('token', token, { expires: 7 });
        setIsAuthenticated(true);

        // Fetch user details from the token
        fetchUserDetails(token);
    };

    // Logout function: removes the token and resets state
    const logout = () => {
        Cookies.remove('token'); // Clear the token from cookies
        setIsAuthenticated(false); // Update state
        setUser(null); // Reset user data
    };

    // Fetch user details using the token's payload
    const fetchUserDetails = async (token) => {
        try {
            // Decode the token to extract the userId (assuming JWT format)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId;

            // Fetch the user's details from the backend
            const response = await fetch(`/api/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            // If user details are found, update state
            if (data.user) {
                setUser(data.user);
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        }
    };

    // Retrieve the token from cookies
    const getToken = () => {
        return Cookies.get('token') || null; // Return the token or `null` if not present
    };

    // Retrieve user ID from the context
    const getUserId = () => {
        return user ? user.id : null;
    };

    // Retrieve user name from the context
    const getUserName = () => {
        return user ? user.name : null;
    };

    // Automatically check for token on app load and set state
    useEffect(() => {
        const token = getToken(); // Get the token from cookies
        if (token) {
            setIsAuthenticated(true); // Set authenticated state
            fetchUserDetails(token); // Fetch and populate user details
        }
    }, []);

    const authenticatedFetch = async (url, options = {}) => {
        const token = getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 403) {
                const data = await response.json();
                if (data.error === 'Invalid token') {
                    logout();
                    return null;
                }
            }
            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            if (error.message.includes('token')) {
                logout();
                return null;
            }
            throw error;
        }
    };

    // Provide the context values
    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            login,
            logout,
            getToken,
            getUserId,
            getUserName,
            user,
            authenticatedFetch
        }}>
            {children}
        </AuthContext.Provider>
    );
};
