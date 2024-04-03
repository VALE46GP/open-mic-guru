import React from 'react';
import DatabaseOverview from '../components/page-testdb/DatabaseOverview';
import CreateUser from '../components/page-testdb/CreateUser';
import CreateEvent from '../components/page-testdb/CreateEvent';
import CreateVenue from '../components/page-testdb/CreateVenue'; // Add this import

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
