import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BorderBox from '../shared/BorderBox/BorderBox';
import { ReactComponent as DeleteIcon } from "../../assets/icons/delete.svg";
import './CreateUser.sass';

function CreateUser({ initialData }) {
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerName, setRegisterName] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [socialMediaAccounts, setSocialMediaAccounts] = useState([]);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

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
        };
        if (registerPassword) payload.password = registerPassword;

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

    return (
        <div className='create-user__container'>
            <h2 className='create-user__title'>{initialData ? 'Edit Profile' : 'Register'}</h2>

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
                {socialMediaAccounts.map((account, index) => (
                    <div key={index} className='create-user__social-media-input-group'>
                        <input
                            type='text'
                            placeholder='Platform'
                            value={account.platform}
                            onChange={(e) => handleSocialMediaChange(index, 'platform', e.target.value)}
                            className='create-user__social-input create-user__social-input--platform'
                        />
                        <input
                            type='text'
                            placeholder='URL'
                            value={account.url}
                            onChange={(e) => handleSocialMediaChange(index, 'url', e.target.value)}
                            className='create-user__social-input create-user__social-input--url'
                        />
                        <button
                            type='button'
                            onClick={() => removeSocialMediaAccount(index)}
                            className='create-user__delete-social-button'
                            aria-label="Delete Social Media Account"
                        >
                            <DeleteIcon className="create-user__delete-icon" />
                        </button>
                    </div>
                ))}
                <button type='button' onClick={addSocialMediaAccount} className='create-user__add-social-button'>
                    Add Social Media Account
                </button>
            </BorderBox>

            {/* BorderBox for Form Fields */}
            <BorderBox className='create-user__form-box'>
                <form onSubmit={handleRegister} className='create-user__form'>
                    <input
                        type='email'
                        placeholder='Email'
                        value={registerEmail}
                        onChange={handleInputChange(setRegisterEmail)}
                        className='create-user__input'
                    />
                    {!initialData && (
                        <input
                            type='password'
                            placeholder='Password'
                            value={registerPassword}
                            onChange={handleInputChange(setRegisterPassword)}
                            className='create-user__input'
                        />
                    )}
                    <input
                        type='text'
                        placeholder='Name'
                        value={registerName}
                        onChange={handleInputChange(setRegisterName)}
                        className='create-user__input'
                    />
                    <button className='create-user__submit-button' type='submit'>
                        {initialData ? 'Save Changes' : 'Register'}
                    </button>
                </form>
            </BorderBox>

            {success && <p className='create-user__success-message'>Profile updated successfully!</p>}
            {error && <p className='create-user__error-message'>{error}</p>}
        </div>
    );
}

export default CreateUser;
