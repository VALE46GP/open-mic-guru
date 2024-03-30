import React, { createContext, useState, useContext, useEffect } from 'react';

const DatabaseDataContext = createContext();

export const useDatabaseData = () => useContext(DatabaseDataContext);

export const DatabaseDataProvider = ({ children }) => {
    const [databaseData, setDatabaseData] = useState({ users: [], events: [], venues: [] });

    const updateDatabaseData = (newData) => {
        setDatabaseData(prevData => ({
            ...prevData,
            ...newData,
        }));
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/testdb');
                const data = await response.json();
                setDatabaseData({
                    counts: data.counts,
                    upcomingEvents: data.upcomingEvents,
                    users: data.users,
                    events: data.events,
                    venues: data.venues
                });
            } catch (error) {
                console.error('Error fetching initial database data:', error);
            }
        };

        fetchData();
    }, []);

    return (
        <DatabaseDataContext.Provider value={{ databaseData, updateDatabaseData }}>
            {children}
        </DatabaseDataContext.Provider>
    );
};
