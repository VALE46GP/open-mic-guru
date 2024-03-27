import React from 'react';
import DatabaseOverview from './DatabaseOverview';
import DatabaseTest from './DatabaseTest';

function TestDbPage() {
  return (
    <div>
      <h1>Test Database Page</h1>
      <DatabaseOverview />
      <DatabaseTest />
    </div>
  );
}

export default TestDbPage;
