import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './VerifyEmailPage.sass';

function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('pending');
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const emailParam = searchParams.get('email');
        
        if (emailParam) {
            setEmail(emailParam);
            setStatus('unverified');
            setMessage('Your email has not been verified yet. Please check your inbox for the verification link or request a new one.');
            return;
        }

        if (!token) {
            setStatus('error');
            setError('No verification token provided');
            return;
        }

        let isSubscribed = true;
        const verifyEmail = async () => {
            try {
                const verifyUrl = `/api/users/verifications/${token}`;
                console.log('Making verification request to:', verifyUrl);

                const verifyResponse = await fetch(verifyUrl, {
                    method: 'PUT',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Response status:', verifyResponse.status);
                const verifyData = await verifyResponse.json();
                console.log('Response data:', verifyData);

                if (!isSubscribed) return; // Don't update state if component unmounted

                if (verifyResponse.ok && verifyData.email) {
                    if (verifyData.message === 'Email verified successfully' || 
                        verifyData.message === 'Email already verified') {
                        setStatus('success');
                        setEmail(verifyData.email);
                    } else {
                        setStatus('error');
                        setError('Verification response was invalid');
                    }
                } else {
                    setStatus('error');
                    setError(verifyData.error || 'Verification failed');
                }
            } catch (err) {
                if (!isSubscribed) return;
                console.error('Verification error:', err);
                setStatus('error');
                setError('An error occurred during verification. Please try again.');
            }
        };

        verifyEmail();
        return () => {
            isSubscribed = false;
        };
    }, [searchParams]);

    const handleResendVerification = async () => {
        if (!email) return;

        try {
            const response = await fetch('/api/users/verifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('A new verification email has been sent. Please check your inbox.');
                setError('');
            } else {
                setError(data.error || 'Failed to resend verification email');
            }
        } catch (err) {
            console.error('Error resending verification:', err);
            setError('Failed to resend verification email');
        }
    };

    return (
        <div className="verify-email">
            <BorderBox>
                {status === 'pending' && (
                    <div className="verify-email__status">
                        <h2>Verifying Your Email</h2>
                        <p>Please wait while we verify your email address...</p>
                    </div>
                )}

                {status === 'unverified' && (
                    <div className="verify-email__status">
                        <h2>Email Not Verified</h2>
                        <p>{message}</p>
                        <button
                            onClick={handleResendVerification}
                            className="verify-email__button verify-email__button--resend"
                        >
                            Resend Verification Email
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="verify-email__button"
                        >
                            Return to Login
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="verify-email__status verify-email__status--success">
                        <h2>Email Verified!</h2>
                        <p>Your email has been successfully verified. You can now log in to your account.</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="verify-email__button"
                        >
                            Go to Login
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="verify-email__status verify-email__status--error">
                        <h2>Verification Failed</h2>
                        <p>{error}</p>
                        {email && (
                            <button
                                onClick={handleResendVerification}
                                className="verify-email__button verify-email__button--resend"
                            >
                                Resend Verification Email
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/login')}
                            className="verify-email__button"
                        >
                            Return to Login
                        </button>
                    </div>
                )}
            </BorderBox>
        </div>
    );
}

export default VerifyEmailPage;