import React from 'react';
import DatabaseOverview from './DatabaseOverview';
import CreateUser from './CreateUser';
import CreateEvent from './CreateEvent';

function TestDbPage() {
  return (
    <div>
      <h1>Test Database Page</h1>
      <DatabaseOverview />
      <CreateUser />
      <CreateEvent />
    </div>
  );
}

export default TestDbPage;
