import React, { useState } from 'react';

function CreateUser() {
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerName, setRegisterName] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleInputChange = (setter) => (e) => {
        setter(e.target.value);
        setError(null);
        setSuccess(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: registerEmail,
                    password: registerPassword,
                    name: registerName,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setSuccess(true);
            } else if (data.error) {
                setError(data.error);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } catch (error) {
            setError('An unexpected error occurred. Please try again.');
        }
    };

    return (
        <div>
            <h2>Register</h2>
            <form onSubmit={handleRegister}>
                <input
                    type="email"
                    placeholder="Email"
                    value={registerEmail}
                    onChange={handleInputChange(setRegisterEmail)}
                    data-testid="email-input"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={registerPassword}
                    onChange={handleInputChange(setRegisterPassword)}
                    data-testid="password-input"
                />
                <input
                    type="text"
                    placeholder="Name"
                    value={registerName}
                    onChange={handleInputChange(setRegisterName)}
                    data-testid="name-input"
                />
                <button type="submit" data-testid="register-button">Register</button>
            </form>
            {success && <p data-testid="success-message">Registration successful! Redirecting...</p>}
            {error && <p data-testid="error-message" style={{ color: 'red' }}>{error}</p>}
        </div>
    );
}

export default CreateUser;
