import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BorderBox from '../shared/BorderBox/BorderBox';
import { ReactComponent as DeleteIcon } from "../../assets/icons/delete.svg";
import { socialMediaPlatforms } from '../utils/socialMediaPlatforms';
import './CreateUser.sass';
import { useAuth } from '../../hooks/useAuth';

axios.defaults.withCredentials = true;

const API_URL = process.env.REACT_APP_API_URL;

function CreateUser({ initialData, onCancel }) {
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerName, setRegisterName] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [socialMediaAccounts, setSocialMediaAccounts] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
    const [passwordResetError, setPasswordResetError] = useState(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const { login, getToken, logout } = useAuth();
    const [bio, setBio] = useState(initialData?.bio || '');

    const defaultImageUrl = 'https://open-mic-guru.s3.us-west-1.amazonaws.com/users/user-default.jpg';

    useEffect(() => {
        if (initialData) {
            setRegisterEmail(initialData.email);
            setRegisterName(initialData.name);
            setProfilePhoto(initialData.image || defaultImageUrl);
            setSocialMediaAccounts(initialData.social_media_accounts || []);
        } else {
            setProfilePhoto(defaultImageUrl);
        }
    }, [initialData]);

    const handleInputChange = (setter) => (e) => {
        setter(e.target.value);
        setError(null);
        setSuccess(false);
    };

    const handleSocialMediaChange = (index, field, value) => {
        const updatedAccounts = [...socialMediaAccounts];
        updatedAccounts[index][field] = value;
        setSocialMediaAccounts(updatedAccounts);
    };

    const addSocialMediaAccount = () => {
        setSocialMediaAccounts([...socialMediaAccounts, { platform: '', url: '' }]);
    };

    const removeSocialMediaAccount = (index) => {
        setSocialMediaAccounts(socialMediaAccounts.filter((_, i) => i !== index));
    };

    const handlePasswordReset = async () => {
        setPasswordResetError(null);
        setPasswordResetSuccess(false);

        try {
            const response = await fetch('/api/users/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    email: registerEmail,
                    isLoggedInRequest: true
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setPasswordResetSuccess(data.message);
            } else {
                setPasswordResetError(data.error || 'Failed to process request');
            }
        } catch (error) {
            setPasswordResetError('An error occurred. Please try again.');
            console.error('Password reset error:', error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        let photoUrl = profilePhoto;
        if (profilePhoto && profilePhoto instanceof File) {
            try {
                const token = getToken();
                const { data } = await axios.post(`${API_URL}/users/upload`, {
                    fileName: profilePhoto.name,
                    fileType: profilePhoto.type,
                    userId: initialData?.id,
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                await axios.put(data.uploadURL, profilePhoto, {
                    headers: { 'Content-Type': profilePhoto.type },
                    withCredentials: false
                });
                photoUrl = data.uploadURL.split('?')[0];
            } catch (error) {
                setError('An error occurred while uploading the photo.');
                console.error('Upload error:', error.response?.data || error);
                return;
            }
        }

        const payload = {
            email: registerEmail,
            name: registerName,
            photoUrl,
            socialMediaAccounts: socialMediaAccounts,
            isUpdate: !!initialData,
            userId: initialData?.id,
            password: initialData ? undefined : registerPassword,
            bio,
        };

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            if (initialData) {
                const token = getToken();
                if (!token) {
                    throw new Error('No authentication token found');
                }
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update user');
            }

            // Handle new user registration
            if (!initialData) {
                if (result.needsVerification) {
                    navigate(`/verify-email?email=${encodeURIComponent(registerEmail)}`);
                    return;
                }
                if (result.token) {
                    login(result.token);
                }
            }

            // Handle profile update
            setSuccess(true);
            if (initialData?.id) {
                navigate(`/users/${initialData.id}`);
            }
        } catch (error) {
            console.error('Registration/Update error:', error);
            setError(error.message || 'An unexpected error occurred.');
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return;
        }

        try {
            const token = getToken();
            
            const response = await axios({
                method: 'DELETE',
                url: `/api/users/${initialData.id}`,
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 204) {
                logout();
                navigate('/');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            setError(error.response?.data?.error || 'Failed to delete account. Please try again.');
        }
    };

    return (
        <div className='create-user__container'>
            <h1 className='create-user__title'>{initialData ? 'Edit Profile' : 'Create New User'}</h1>

            {/* BorderBox for Profile Photo */}
            <BorderBox
                onEdit={() => fileInputRef.current.click()}
                onDelete={() => setProfilePhoto(defaultImageUrl)}
                className='create-user__profile-box'
            >
                <img
                    src={profilePhoto instanceof File ? URL.createObjectURL(profilePhoto) : profilePhoto}
                    alt='Profile Preview'
                    className='create-user__profile-image'
                />
                <input
                    type='file'
                    ref={fileInputRef}
                    onChange={(e) => e.target.files[0] && setProfilePhoto(e.target.files[0])}
                    style={{ display: 'none' }}
                />
            </BorderBox>

            {/* BorderBox for Social Media Accounts */}
            <BorderBox className='create-user__social-media-box'>
                <h3>Social Media Accounts</h3>
                {socialMediaAccounts.map((account, index) => {
                    // Find the selected platform's details
                    const platformDetails = socialMediaPlatforms.find(
                        (platform) => platform.name === account.platform
                    );
                    const PlatformIcon = platformDetails ? platformDetails.icon : null;

                    return (
                        <div key={index} className='create-user__social-media-input-group'>
                            {/* Dropdown to select platform */}
                            <select
                                value={account.platform}
                                onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}
                                className='create-user__social-input create-user__social-input--platform'
                            >
                                <option value=''>Select Platform</option>
                                {socialMediaPlatforms.map((platform) => (
                                    <option key={platform.name} value={platform.name}>
                                        {platform.name}
                                    </option>
                                ))}
                            </select>

                            {/* Display selected platform icon */}
                            {PlatformIcon && <PlatformIcon className="create-user__social-icon"/>}

                            {/* URL input */}
                            <input
                                type='text'
                                placeholder='URL'
                                value={account.url}
                                onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)}
                                className='create-user__social-input create-user__social-input--url'
                            />

                            {/* Delete account button */}
                            <button
                                type='button'
                                onClick={() => removeSocialMediaAccount(index)}
                                className='create-user__delete-social-button'
                                aria-label="Delete Social Media Account"
                            >
                                <DeleteIcon className="create-user__delete-icon"/>
                            </button>
                        </div>
                    );
                })}

                {/* Button to add a new social media account */}
                <button type='button' onClick={addSocialMediaAccount}
                        className='create-user__add-social-button'>
                    Add Social Media Account
                </button>
            </BorderBox>

            {/* BorderBox for Form Fields */}
            <BorderBox className='create-user__form-box'>
                <form className='create-user__form'>
                    <div className='create-user__input-group'>
                        <label htmlFor='email' className='create-user__label'>Email</label>
                        <input
                            id='email'
                            type='email'
                            placeholder='Email'
                            value={registerEmail}
                            onChange={handleInputChange(setRegisterEmail)}
                            className='create-user__input'
                        />
                    </div>
                    {!initialData && (
                        <div className='create-user__input-group'>
                            <label htmlFor='password'
                                   className='create-user__label'>Password</label>
                            <input
                                id='password'
                                type='password'
                                placeholder='Password'
                                value={registerPassword}
                                onChange={handleInputChange(setRegisterPassword)}
                                className='create-user__input'
                            />
                        </div>
                    )}
                    <div className='create-user__input-group'>
                        <label htmlFor='name' className='create-user__label'>Name</label>
                        <input
                            id='name'
                            type='text'
                            placeholder='Name'
                            value={registerName}
                            onChange={handleInputChange(setRegisterName)}
                            className='create-user__input'
                        />
                    </div>
                    <div className='create-user__input-group'>
                        <label htmlFor='bio' className='create-user__label'>Bio</label>
                        <textarea
                            id='bio'
                            className='create-user__input create-user__input--textarea'
                            value={bio}
                            onChange={handleInputChange(setBio)}
                            placeholder='Tell us about yourself...'
                            rows={4}
                        />
                    </div>
                </form>
            </BorderBox>

            {passwordResetSuccess && (
                <div className='create-user__success-message create-user__success-message--password'>
                    {passwordResetSuccess}
                </div>
            )}
            {passwordResetError && (
                <div className='create-user__error-message create-user__error-message--password'>
                    {passwordResetError}
                </div>
            )}
            {initialData && (
                <button
                    type="button"
                    onClick={handlePasswordReset}
                    className='create-user__password-reset-button'
                >
                    Reset Password
                </button>
            )}

            <div className="create-user__button-group">
                <button
                    className='create-user__submit-button'
                    onClick={handleRegister}
                >
                    {initialData ? 'Save Changes' : 'Register'}
                </button>
                {initialData && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className='create-user__cancel-button'
                    >
                        Cancel
                    </button>
                )}
                {initialData && (
                    <button
                        type="button"
                        onClick={handleDeleteAccount}
                        className='create-user__delete-button'
                    >
                        Delete Account
                    </button>
                )}
            </div>

            {success &&
                <p className='create-user__success-message'>Profile updated successfully!</p>}
            {error && <p className='create-user__error-message'>{error}</p>}
        </div>
    );
}

export default CreateUser;
