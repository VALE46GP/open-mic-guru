import React, { useState, useEffect } from 'react';
import axios from 'axios';

function CreateUser({ initialData }) {
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerName, setRegisterName] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (initialData) {
            setRegisterEmail(initialData.email);
            setRegisterName(initialData.name);
        }
    }, [initialData]);

    const handleInputChange = (setter) => (e) => {
        setter(e.target.value);
        setError(null);
        setSuccess(false);
    };

    const handleFileChange = (e) => {
        setProfilePhoto(e.target.files[0]);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
    
        let photoUrl = null;
    
        if (profilePhoto) {
            try {
                const { data } = await axios.post('/api/users/upload', {
                    fileName: profilePhoto.name,
                    fileType: profilePhoto.type,
                    userId: initialData?.id // Pass user ID if it's an update
                });
    
                console.log('Upload URL:', data.uploadURL);
                console.log('Profile Photo:', profilePhoto);
    
                await axios.put(data.uploadURL, profilePhoto, {
                    headers: {
                        'Content-Type': profilePhoto.type
                    }
                });
    
                photoUrl = data.uploadURL.split('?')[0]; // Get the URL of the uploaded image
            } catch (error) {
                setError('An unexpected error occurred while uploading the photo. Please try again.');
                console.error('Upload error:', error.response?.data || error);
                return;
            }
        }
    
        try {
            const payload = {
                email: registerEmail,
                name: registerName,
                photoUrl, // Include the image URL in the payload
                isUpdate: !!initialData, // Indicates if this is an update request
                userId: initialData?.id // Pass user ID if it's an update
            };
            
            if (registerPassword) {
                payload.password = registerPassword; // Only include password if provided
            }
    
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
    
            const result = await response.json();
            if (response.ok) {
                setSuccess(true);
            } else if (result.errors) {
                setError(result.errors[0].msg);
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } catch (error) {
            setError('An unexpected error occurred. Please try again.');
        }
    };

    return (
        <div>
            <h2>{initialData ? 'Edit Profile' : 'Register'}</h2>
            <form onSubmit={handleRegister}>
                <input
                    type="email"
                    placeholder="Email"
                    value={registerEmail}
                    onChange={handleInputChange(setRegisterEmail)}
                    data-testid="email-input"
                />
                {!initialData && (
                    <input
                        type="password"
                        placeholder="Password"
                        value={registerPassword}
                        onChange={handleInputChange(setRegisterPassword)}
                        data-testid="password-input"
                    />
                )}
                <input
                    type="text"
                    placeholder="Name"
                    value={registerName}
                    onChange={handleInputChange(setRegisterName)}
                    data-testid="name-input"
                />
                <input
                    type="file"
                    onChange={handleFileChange}
                    data-testid="photo-input"
                />
                <button type="submit" data-testid="register-button">{initialData ? 'Update' : 'Register'}</button>
            </form>
            {success && <p data-testid="success-message">{initialData ? 'Profile updated successfully!' : 'Registration successful!'}</p>}
            {error && <p data-testid="error-message" style={{ color: 'red' }}>{error}</p>}
            {profilePhoto && (
                <div>
                    <img src={URL.createObjectURL(profilePhoto)} alt="Profile Preview" style={{ width: '150px', height: '150px', borderRadius: '50%' }} />
                </div>
            )}
        </div>
    );
}

export default CreateUser;
