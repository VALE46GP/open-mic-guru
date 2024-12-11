// NotificationsContext.js
import React, { createContext, useContext } from 'react';

export const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children, value }) => (
    <NotificationsContext.Provider value={value}>
        {children}
    </NotificationsContext.Provider>
);

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (context === null) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};