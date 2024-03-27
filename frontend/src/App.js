import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'; // Import Routes instead of Switch
import TestDbPage from './TestDbPage'; // Import the TestDbPage component
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes> {/* Use Routes here instead of Switch */}
          <Route path="/testdb" element={<TestDbPage />} />
          {/* Define other routes here */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
