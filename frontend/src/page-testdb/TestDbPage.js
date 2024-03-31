import React from 'react';
import DatabaseOverview from './DatabaseOverview';
import CreateUser from './CreateUser';
import CreateEvent from './CreateEvent';
import CreateVenue from './CreateVenue'; // Add this import

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
