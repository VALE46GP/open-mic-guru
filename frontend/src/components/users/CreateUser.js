import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BorderBox from '../shared/BorderBox/BorderBox';
import { ReactComponent as DeleteIcon } from "../../assets/icons/delete.svg";
import { socialMediaPlatforms } from '../utils/socialMediaPlatforms';
import './CreateUser.sass';
import { useAuth } from '../../hooks/useAuth';

function CreateUser({ initialData, onCancel }) {
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerName, setRegisterName] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [socialMediaAccounts, setSocialMediaAccounts] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState(null);
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
        setPasswordError(null);
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

    const validatePasswordChange = async () => {
        if (newPassword && !oldPassword) {
            setPasswordError('Old password is required to change password');
            return false;
        }

        if (oldPassword) {
            try {
                const response = await fetch('/api/users/validate-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: initialData.id,
                        password: oldPassword
                    })
                });

                if (!response.ok) {
                    console.log('Password validation failed:', await response.json());
                    setPasswordError('Invalid old password');
                    return false;
                }
                console.log('Password validation successful');
                setPasswordError(null);
            } catch (error) {
                console.error('Error validating password:', error);
                setPasswordError('Error validating password');
                return false;
            }
        }
        return true;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (initialData && newPassword) {
            const isValid = await validatePasswordChange();
            if (!isValid) return;
        }

        let photoUrl = profilePhoto;
        if (profilePhoto && profilePhoto instanceof File) {
            try {
                const { data } = await axios.post('/api/users/upload', {
                    fileName: profilePhoto.name,
                    fileType: profilePhoto.type,
                    userId: initialData?.id,
                });

                await axios.put(data.uploadURL, profilePhoto, {
                    headers: { 'Content-Type': profilePhoto.type },
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
            password: initialData ? newPassword : registerPassword,
            bio,
        };

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update user');
            }

            if (!initialData && result.token) {
                login(result.token);
            }

            setSuccess(true);
            if (initialData?.id) {
                navigate(`/users/${initialData.id}`);
            } else if (result.user?.id) {
                navigate(`/users/${result.user.id}`);
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
            <h2 className='create-user__title'>{initialData ? 'Edit Profile' : 'Create New User'}</h2>

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

            {/* New BorderBox for Password Change */}
            {initialData && (
                <BorderBox className='create-user__password-box'>
                    <h3>Change Password</h3>
                    {passwordError && (
                        <p className='create-user__password-error'>{passwordError}</p>
                    )}
                    <div className='create-user__input-group'>
                        <label htmlFor='old-password' className='create-user__label'>Old
                            Password</label>
                        <input
                            id='old-password'
                            type='password'
                            placeholder='Old Password'
                            value={oldPassword}
                            onChange={handleInputChange(setOldPassword)}
                            className='create-user__input'
                        />
                    </div>
                    <div className='create-user__input-group'>
                        <label htmlFor='new-password' className='create-user__label'>New
                            Password</label>
                        <input
                            id='new-password'
                            type='password'
                            placeholder='New Password'
                            value={newPassword}
                            onChange={handleInputChange(setNewPassword)}
                            className='create-user__input'
                        />
                    </div>
                </BorderBox>
            )}

            {/* Moved buttons outside of BorderBox */}
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
