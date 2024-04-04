import React from 'react';
import DatabaseOverview from '../../components/utils/DatabaseOverview';
import CreateUser from '../../components/users/CreateUser';
import CreateEvent from '../../components/events/CreateEvent';
import CreateVenue from '../../components/venues/CreateVenue'; // Add this import

function TestDbPage() {
  return (
    <div className="App">
      <h1>Test Database Page</h1>
      <DatabaseOverview />
      <CreateUser />
      <CreateEvent />
      <CreateVenue />
    </div>
  );
}

export default TestDbPage;
