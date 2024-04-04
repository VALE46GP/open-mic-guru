import React from 'react';
import Cookies from 'js-cookie';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ element, ...rest }) => {
    const isAuthenticated = !!Cookies.get('token');
    return isAuthenticated ? element : <Navigate to="/login" />;
};

export default ProtectedRoute;
