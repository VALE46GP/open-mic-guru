import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CreateUser from '../../components/users/CreateUser';
import { useAuth } from '../../hooks/useAuth';

function EditUserPage() {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || String(user.id) !== String(userId)) {
            navigate('/');
            return;
        }

        const fetchUserData = async () => {
            try {
                const response = await fetch(`/api/users/${userId}`);
                const data = await response.json();
                setUserData(data.user);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [userId, user, navigate]);

    const handleCancel = () => {
        navigate(`/users/${userId}`);
    };

    if (!userData) return <div>Loading...</div>;

    return (
        <div>
            <h2>Edit Profile</h2>
            <CreateUser initialData={userData} onCancel={handleCancel}/>
        </div>
    );
}

export default EditUserPage;
