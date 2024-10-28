import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.sass';
import Navigation from './components/navigation/Navigation';
import TestDbPage from './pages/TestDb/TestDbPage';
import LoginPage from './pages/Login/LoginPage';
import CreateEventPage from './pages/Event/CreateEventPage';
import EventPage from './pages/Event/EventPage';
import UserPage from './pages/User/UserPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/utils/ProtectedRoute';
import EventsPage from './pages/Events/EventsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navigation />
          <Routes>
            <Route path="/" element={<Navigate to="/testdb" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/testdb" element={<ProtectedRoute element={<TestDbPage />} />} />
            <Route path="/create-event" element={<ProtectedRoute element={<CreateEventPage />} />} />
            <Route path="/events/:eventId" element={<ProtectedRoute element={<EventPage />} />} />
            <Route path="/events/:eventId/edit" element={<ProtectedRoute element={<CreateEventPage />} />} />
            <Route path="/users/:userId" element={<ProtectedRoute element={<UserPage />} />} />
            <Route path="/events" element={<ProtectedRoute element={<EventsPage />} />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
