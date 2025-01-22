import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ element, ...rest }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    return isAuthenticated ? 
        element : 
        <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedRoute;
