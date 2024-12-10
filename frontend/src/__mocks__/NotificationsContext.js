import React from 'react';
import { populatedMockHook } from '../testData/mockNotifications';

export const NotificationsContext = React.createContext(null);

export const NotificationsProvider = ({ children }) => (
    <NotificationsContext.Provider value={populatedMockHook}>
        {children}
    </NotificationsContext.Provider>
);

export const useNotifications = () => React.useContext(NotificationsContext);
