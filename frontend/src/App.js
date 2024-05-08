import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/navigation/Navigation';
import TestDbPage from './pages/TestDb/TestDbPage';
import LoginPage from './pages/Login/LoginPage';
import CreateEventPage from './pages/Event/CreateEventPage';
import EventPage from './pages/Event/EventPage';
import UserPage from './pages/User/UserPage';
import './App.sass';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/utils/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/testdb" element={<ProtectedRoute element={<TestDbPage />} />} />
            <Route path="/create-event" element={<ProtectedRoute element={<CreateEventPage />} />} />
            <Route path="/events/:eventId" element={<ProtectedRoute element={<EventPage />} />} />
            <Route path="/events/:eventId/edit" element={<ProtectedRoute element={<CreateEventPage />} />} />
            <Route path="/users/:userId" element={<ProtectedRoute element={<UserPage />} />} />
          </Routes>
        </AuthProvider>
      </div>
    </Router>
  );
}

export default App;
