import React, { useEffect, useState } from 'react';
import DatabaseOverview from '../../components/utils/DatabaseOverview';
import CreateUser from '../../components/users/CreateUser';
import CreateEvent from '../../components/events/CreateEvent';
import CreateVenue from '../../components/venues/CreateVenue';

function TestDbPage() {
    const [databaseData, setDatabaseData] = useState({ users: [], events: [], venues: [] });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/testdb');
                const data = await response.json();
                setDatabaseData(data);
            } catch (error) {
                console.error('Error fetching database data:', error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="App">
            <h1>Test Database Page</h1>
            <DatabaseOverview databaseData={databaseData}/>
            <CreateUser/>
            <CreateEvent/>
            <CreateVenue/>
        </div>
    );
}

export default TestDbPage;
