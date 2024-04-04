import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import TestDbPage from './pages/TestDb/TestDbPage';
import './App.sass';
// Removed DatabaseDataProvider import since it's no longer used here
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/utils/ProtectedRoute';
import LoginPage from './pages/Login/LoginPage';
import CreateEventPage from './pages/Event/CreateEventPage';
import EventPage from './pages/Event/EventPage';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="navigation">
          <Link to="/testdb">Test Database</Link>
          <Link to="/create-event">Create Event</Link>
        </div>
        <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/testdb" element={<ProtectedRoute element={<TestDbPage />} />} />
              <Route path="/create-event" element={<ProtectedRoute element={<CreateEventPage />} />} />
              <Route path="/events/:eventId" element={<ProtectedRoute element={<EventPage />} />} />
            </Routes>
        </AuthProvider>
      </div>
    </Router>
  );
}

export default App;
