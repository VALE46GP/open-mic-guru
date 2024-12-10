import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.sass';
import Navigation from './components/navigation/Navigation';
import LoginPage from './pages/Login/LoginPage';
import CreateEventPage from './pages/Event/CreateEventPage';
import EventPage from './pages/Event/EventPage';
import UserPage from './pages/User/UserPage';
import EditUserPage from './pages/EditUser/EditUserPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/utils/ProtectedRoute';
import EventsPage from './pages/Events/EventsPage';
import { WebSocketProvider } from './context/WebSocketContext';
import UsersPage from './pages/Users/UsersPage';
import { NotificationsProvider } from './context/NotificationsContext';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import NotFoundPage from './pages/NotFound/NotFoundPage';

function App() {
    return (
        <AuthProvider>
            <WebSocketProvider>
                <NotificationsProvider>
                    <div className="app">
                        <Navigation />
                        <div className="app__container" data-testid="app-container">
                            <div className="app__content">
                                <Routes>
                                    <Route path="/" element={<EventsPage />} />
                                    <Route path="/login" element={<LoginPage />} />
                                    <Route path="/create-event" element={<ProtectedRoute element={<CreateEventPage />} />} />
                                    <Route path="/events/:eventId" element={<EventPage />} />
                                    <Route path="/events/:eventId/edit" element={<ProtectedRoute element={<CreateEventPage />} />} />
                                    <Route path="/users/:userId" element={<UserPage />} />
                                    <Route path="/users/:userId/edit" element={<EditUserPage />} />
                                    <Route path="/events" element={<EventsPage />} />
                                    <Route path="/users" element={<UsersPage />} />
                                    <Route path="/notifications" element={<NotificationsPage />} />
                                    {/* Fallback route */}
                                    <Route path="*" element={<NotFoundPage />} />
                                </Routes>
                            </div>
                        </div>
                    </div>
                </NotificationsProvider>
            </WebSocketProvider>
        </AuthProvider>
    );
}

export default App;