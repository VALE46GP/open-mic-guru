import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TestDbPage from './pages/TestDbPage';
import './App.css';
import { DatabaseDataProvider } from './context/DatabaseContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';

function App() {
  return (
    <Router>
      <div className="App">
        <DatabaseDataProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/testdb" element={<ProtectedRoute element={<TestDbPage />} />} />
            </Routes>
          </AuthProvider>
        </DatabaseDataProvider>
      </div>
    </Router>
  );
}

export default App;
