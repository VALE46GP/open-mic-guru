import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ReactComponent as EditIcon } from '../../assets/icons/edit.svg';
import { ReactComponent as DeleteIcon } from '../../assets/icons/delete.svg';
import BorderBox from '../shared/BorderBox/BorderBox';
import './CreateUser.sass';

function CreateUser({ initialData }) {
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerName, setRegisterName] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const defaultImageUrl = 'https://open-mic-guru.s3.us-west-1.amazonaws.com/users/user-default.jpg';

    useEffect(() => {
        if (initialData) {
            setRegisterEmail(initialData.email);
            setRegisterName(initialData.name);
            setProfilePhoto(initialData.image || defaultImageUrl);
        } else {
            setProfilePhoto(defaultImageUrl);
        }
    }, [initialData]);

    const handleInputChange = (setter) => (e) => {
        setter(e.target.value);
        setError(null);
        setSuccess(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
        }
    };

    const handleEditClick = () => {
        fileInputRef.current.click(); // Trigger the file input when edit button is clicked
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        let photoUrl = profilePhoto;

        if (profilePhoto && profilePhoto instanceof File) {
            try {
                const { data } = await axios.post('/api/users/upload', {
                    fileName: profilePhoto.name,
                    fileType: profilePhoto.type,
                    userId: initialData?.id // Pass user ID if it's an update
                });

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
            } else {
                // Check for specific error message
                const emailError = result.errors?.find(err => err.msg === 'Email is already in use');
                if (emailError) {
                    setError('This email is already registered. Please use a different email.');
                } else {
                    setError(result.errors?.[0]?.msg || 'Registration failed');
                }
            }
        } catch (error) {
            setError('An unexpected error occurred. Please try again.');
        }
    };

    return (
        <div className='create-user__container'>
            <h2 className='create-user__title'>{initialData ? 'Edit Profile' : 'Register'}</h2>
            <BorderBox
                onEdit={handleEditClick}
                onDelete={() => setProfilePhoto(defaultImageUrl)}
                className='create-user__profile-box'
            >
                <img
                    src={profilePhoto instanceof File ? URL.createObjectURL(profilePhoto) : (profilePhoto || defaultImageUrl)}
                    alt='Profile Preview'
                    className='create-user__profile-image'
                />
                <input
                    type='file'
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </BorderBox>

            <BorderBox className='create-user__form-box'>
                <form onSubmit={handleRegister} className='create-user__form'>
                    <input
                        type='email'
                        placeholder='Email'
                        value={registerEmail}
                        onChange={handleInputChange(setRegisterEmail)}
                        data-testid='email-input'
                        className='create-user__input'
                    />
                    {!initialData && (
                        <input
                            type='password'
                            placeholder='Password'
                            value={registerPassword}
                            onChange={handleInputChange(setRegisterPassword)}
                            data-testid='password-input'
                            className='create-user__input'
                        />
                    )}
                    <input
                        type='text'
                        placeholder='Name'
                        value={registerName}
                        onChange={handleInputChange(setRegisterName)}
                        data-testid='name-input'
                        className='create-user__input'
                    />
                    <button
                        className="create-user__submit-button"
                        type="submit"
                        data-testid="register-button"
                    >
                        {initialData ? 'Save Changes' : 'Register'}
                    </button>
                </form>
            </BorderBox>
            
            {success && <p className='create-user__success-message' data-testid='success-message'>
                {initialData ? 'Profile updated successfully!' : 'Registration successful!'}
            </p>}
            {error && <p className='create-user__error-message' data-testid='error-message'>{error}</p>}
        </div>
    );
}

export default CreateUser;
