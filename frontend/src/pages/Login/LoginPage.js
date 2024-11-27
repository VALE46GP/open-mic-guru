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
            } else {
                setError(data.errors?.[0]?.msg || 'Invalid credentials');
            }
        } catch (error) {
            setError('An error occurred during login');
            console.error('Login error:', error);
        }
    };

    return (
        <div>
            <button 
                className="login-page__button"
                data-testid="toggle-form-button"
                onClick={() => setShowCreateUser(!showCreateUser)}
            >
                {showCreateUser ? 'Login Existing User' : 'Create New User'}
            </button>
            {!showCreateUser ? (
                <h2>Login Existing User</h2>
            ) : (
                <div/>
            )}
            {error && <div data-testid="error-message" className="error-message">{error}</div>}
            {success && <div data-testid="success-message" className="success-message">Login successful!</div>}
            {showCreateUser ? (
                <CreateUser/>
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
                </form>
            )}
        </div>
    );
}

export default LoginPage;

