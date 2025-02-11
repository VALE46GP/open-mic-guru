import React, { createContext, useState, useEffect, useCallback } from 'react';
import { BASE_URL } from '../config';

// console.log('Domain debug:', {
//     hostname: window.location.hostname,
//     host: window.location.host,
//     href: window.location.href,
//     protocol: window.location.protocol
// });

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        // Initialize isAuthenticated based on token existence
        const token = sessionStorage.getItem('authToken');
        // console.log('Initial auth state check:', { hasToken: !!token });
        return !!token;
    });
    const [user, setUser] = useState(null);
    const [authToken, setAuthToken] = useState(() => {
        return sessionStorage.getItem('authToken');
    });

    // Logout function: removes the token and resets state
    const logout = useCallback(() => {
        // console.log('Logging out, clearing auth state');
        sessionStorage.removeItem('authToken');
        setAuthToken(null);
        setIsAuthenticated(false);
        setUser(null);
    }, []);

    // Create fetchUserDetails as a memoized function
    const fetchUserDetails = useCallback(async (token) => {
        try {
            // Decode the token to extract the userId
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId;

            // Fetch the user's details from the backend
            const response = await fetch(`${BASE_URL}/users/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            // If user details are found, update state
            if (data.user) {
                setUser(data.user);
            } else {
                // If no user data found, something's wrong with the token
                logout();
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
            logout();
        }
    }, [logout]);

    // Initialize user data if we have a token
    useEffect(() => {
        const token = sessionStorage.getItem('authToken');
        if (token) {
            fetchUserDetails(token);
        }
    }, [fetchUserDetails]);

    // Login function: stores the token in sessionStorage and state
    const login = useCallback((token) => {
        if (!token) {
            console.error('Attempted login with null token');
            return;
        }

        console.log('Setting auth token and state');
        sessionStorage.setItem('authToken', token);
        setAuthToken(token);
        setIsAuthenticated(true);
        fetchUserDetails(token);
    }, [fetchUserDetails]);

    // Get the token from state with expiration check
    const getToken = () => {
        const token = authToken;
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const isExpired = Date.now() >= payload.exp * 1000;
                
                if (isExpired) {
                    logout();
                    return null;
                }
                // console.log('Token verified:', { isAuthenticated, userId: payload.userId });
                return token;
            } catch (error) {
                console.error('Error parsing token:', error);
                logout();
                return null;
            }
        }
        console.log('No token found in getToken');
        return null;
    };

    // Get user ID from state
    const getUserId = () => {
        return user ? user.id : null;
    };

    // Get user name from state
    const getUserName = () => {
        return user ? user.name : null;
    };

    const authenticatedFetch = async (url, options = {}) => {
        const token = getToken();
        // console.log('authenticatedFetch called:', { 
        //     url, 
        //     hasToken: !!token, 
        //     isAuthenticated 
        // });
        
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
                console.log('Received 403 response:', { url });
                const data = await response.json();
                if (data.error === 'Invalid token') {
                    console.log('Invalid token detected, logging out');
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

    // useEffect(() => {
    //     console.log('Auth state changed:', { 
    //         isAuthenticated, 
    //         hasToken: !!authToken,
    //         hasUser: !!user 
    //     });
    // }, [isAuthenticated, authToken, user]);

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
