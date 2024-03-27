import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TestDbPage from './page-testdb/TestDbPage';
import './App.css';
import { DatabaseDataProvider } from './context/DatabaseContext';

function App() {
  return (
    <Router>
      <div className="App">
        <DatabaseDataProvider>
          <Routes>
            <Route path="/testdb" element={<TestDbPage />} />
          </Routes>
        </DatabaseDataProvider>
      </div>
    </Router>
  );
}

export default App;
