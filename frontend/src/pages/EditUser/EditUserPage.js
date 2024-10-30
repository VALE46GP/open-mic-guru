import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CreateUser from '../../components/users/CreateUser';
import { useAuth } from '../../hooks/useAuth'; // Assuming you have a useAuth hook

function EditUserPage() {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);
    const { user } = useAuth(); // Get the logged-in user
    const navigate = useNavigate();

    useEffect(() => {
        // Debugging logs
        console.log('Logged-in user:', user);
        console.log('Logged-in user ID:', user?.id);
        console.log('Profile user ID:', userId);
        console.log('Type of logged-in user ID:', typeof user?.id);
        console.log('Type of profile user ID:', typeof userId);

        if (!user || String(user.id) !== String(userId)) {
            navigate('/'); // Redirect if the user is trying to access another user's page
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

    if (!userData) return <div>Loading...</div>;

    return (
        <div>
            <h2>Edit Profile</h2>
            <CreateUser initialData={userData} />
        </div>
    );
}

export default EditUserPage;
