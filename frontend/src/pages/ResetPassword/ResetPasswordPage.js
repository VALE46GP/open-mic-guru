import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './ResetPasswordPage.sass';
import { BASE_URL } from '../../config';

function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!newPassword || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        try {
            const response = await fetch(`${BASE_URL}/users/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    newPassword
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            setError('An error occurred. Please try again.');
        }
    };

    if (!token) {
        return (
            <div className="reset-password">
                <BorderBox>
                    <div className="reset-password__error">
                        <h2>Invalid Reset Link</h2>
                        <p>This password reset link is invalid or has expired.</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="reset-password__button"
                        >
                            Return to Login
                        </button>
                    </div>
                </BorderBox>
            </div>
        );
    }

    return (
        <div className="reset-password">
            <BorderBox>
                <h2>Reset Your Password</h2>
                {error && (
                    <div className="reset-password__error-message">
                        {error}
                    </div>
                )}
                {success ? (
                    <div className="reset-password__success">
                        <p>Your password has been reset successfully!</p>
                        <p>Redirecting to login page...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="reset-password__form">
                        <div className="reset-password__input-group">
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="reset-password__input"
                                data-testid="new-password-input"
                            />
                        </div>
                        <div className="reset-password__input-group">
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="reset-password__input"
                                data-testid="confirm-password-input"
                            />
                        </div>
                        <button 
                            type="submit"
                            className="reset-password__button"
                            data-testid="reset-password-button"
                        >
                            Reset Password
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="reset-password__button reset-password__button--secondary"
                        >
                            Cancel
                        </button>
                    </form>
                )}
            </BorderBox>
        </div>
    );
}

export default ResetPasswordPage; 