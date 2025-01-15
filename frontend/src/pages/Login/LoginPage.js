import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import CreateUser from '../../components/users/CreateUser';
import './LoginPage.sass';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (response.ok && data.token) {
                setSuccess(true);
                login(data.token);
                navigate('/');
            } else if (data.needsVerification) {
                navigate(`/verify-email?email=${encodeURIComponent(email)}`);
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (error) {
            setError('An error occurred during login');
            console.error('Login error:', error);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setForgotPasswordMessage('');

        if (!forgotPasswordEmail) {
            setError('Please enter your email address');
            return;
        }

        try {
            const response = await fetch('/api/users/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: forgotPasswordEmail }),
            });

            const data = await response.json();

            if (response.ok) {
                setForgotPasswordMessage(data.message);
                setForgotPasswordEmail('');
            } else {
                setError(data.error || 'Failed to process request');
            }
        } catch (error) {
            setError('An error occurred. Please try again.');
            console.error('Forgot password error:', error);
        }
    };

    return (
        <div className="login-page">
            <button 
                className="login-page__button"
                data-testid="toggle-form-button"
                onClick={() => setShowCreateUser(!showCreateUser)}
            >
                {showCreateUser ? 'Login Existing User' : 'Create New User'}
            </button>
            {!showCreateUser && !showForgotPassword && (
                <h2>Login Existing User</h2>
            )}
            {error && <div data-testid="error-message" className="error-message">{error}</div>}
            {success && <div data-testid="success-message" className="success-message">Login successful!</div>}
            {forgotPasswordMessage && (
                <div className="success-message">{forgotPasswordMessage}</div>
            )}
            {showCreateUser ? (
                <CreateUser/>
            ) : showForgotPassword ? (
                <form onSubmit={handleForgotPassword}>
                    <h2>Reset Password</h2>
                    <input
                        type="email"
                        placeholder="Email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        data-testid="forgot-password-email"
                    />
                    <button type="submit">Send Reset Link</button>
                    <button 
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                    >
                        Back to Login
                    </button>
                </form>
            ) : (
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        data-testid="email-input"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        data-testid="password-input"
                    />
                    <button 
                        type="submit"
                        data-testid="login-button"
                    >
                        Login
                    </button>
                    <button 
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="login-page__forgot-password"
                    >
                        Forgot Password?
                    </button>
                </form>
            )}
        </div>
    );
}

export default LoginPage;

