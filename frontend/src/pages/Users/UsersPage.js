import React, { useEffect, useState } from 'react';
import UserCard from '../../components/users/UserCard';
import './UsersPage.sass';

function UsersPage() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Adjust based on how you store the token
                    },
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                const usersData = await response.json();
                setUsers(usersData);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
    
        fetchUsers();
    }, []);

    return (
        <div className="users-page">
            <h1>Users</h1>
            <div className="users-page__list">
                {users.map(user => (
                    <UserCard key={user.id} user={user} />
                ))}
            </div>
        </div>
    );
}

export default UsersPage;
