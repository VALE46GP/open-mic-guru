import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import CreateUser from '../../components/users/CreateUser';
import './LoginPage.sass';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [showCreateUser, setShowCreateUser] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (data.token) {
                login(data.token);
                console.log('Token saved:', data.token);
                navigate('/');
            } else {
                alert('Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    return (
        <div>
            <button className="login-page__button" onClick={() => setShowCreateUser(!showCreateUser)}>
                {showCreateUser ? 'Login Existing User' : 'Create New User'}
            </button>
            {!showCreateUser ? (
                <h2>Login Existing User</h2>
            ) : (
                <div />
            )}
            {showCreateUser ? (
                <CreateUser />
            ) : (
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit">Login</button>
                </form>
            )}
        </div>
    );
}

export default LoginPage;

