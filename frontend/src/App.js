import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TestDbPage from './pages/TestDb/TestDbPage';
import './App.css';
import { DatabaseDataProvider } from './context/DatabaseContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/utils/ProtectedRoute';
import LoginPage from './pages/Login/LoginPage';
import CreateEventPage from './pages/Event/CreateEventPage'; // Added import for CreateEventPage

function App() {
  return (
    <Router>
      <div className="App">
        <DatabaseDataProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/testdb" element={<ProtectedRoute element={<TestDbPage />} />} />
              <Route path="/create-event" element={<ProtectedRoute element={<CreateEventPage />} />} /> {/* Added route for CreateEventPage */}
            </Routes>
          </AuthProvider>
        </DatabaseDataProvider>
      </div>
    </Router>
  );
}

export default App;
