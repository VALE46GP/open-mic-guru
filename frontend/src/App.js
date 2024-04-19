import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import TestDbPage from './pages/TestDb/TestDbPage';
import './App.sass';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/utils/ProtectedRoute';
import LoginPage from './pages/Login/LoginPage';
import CreateEventPage from './pages/Event/CreateEventPage';
import EventPage from './pages/Event/EventPage';
import UserPage from './pages/User/UserPage';
import { DatabaseDataProvider } from './context/DatabaseContext';

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
              <Route path="/testdb" element={<ProtectedRoute element={<DatabaseDataProvider><TestDbPage /></DatabaseDataProvider>} />} />
              <Route path="/create-event" element={<ProtectedRoute element={<CreateEventPage />} />} />
              <Route path="/events/:eventId" element={<ProtectedRoute element={<EventPage />} />} />
              <Route path="/users/:userId" element={<ProtectedRoute element={<UserPage />} />} />
            </Routes>
        </AuthProvider>
      </div>
    </Router>
  );
}

export default App;
