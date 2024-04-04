import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TestDbPage from './pages/TestDb/TestDbPage';
import './App.sass';
import { DatabaseDataProvider } from './context/DatabaseContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/utils/ProtectedRoute';
import LoginPage from './pages/Login/LoginPage';
import CreateEventPage from './pages/Event/CreateEventPage';
import EventPage from './pages/Event/EventPage';

function App() {
  return (
    <Router>
      <div className="App">
        <DatabaseDataProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/testdb" element={<ProtectedRoute element={<TestDbPage />} />} />
              <Route path="/create-event" element={<ProtectedRoute element={<CreateEventPage />} />} />
              <Route path="/events/:eventId" element={<ProtectedRoute element={<EventPage />} />} />
            </Routes>
          </AuthProvider>
        </DatabaseDataProvider>
      </div>
    </Router>
  );
}

export default App;
