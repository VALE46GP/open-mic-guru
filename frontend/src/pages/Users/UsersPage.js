import React, { useEffect, useState } from 'react';
import UserCard from '../../components/users/UserCard';
import UserSearch from '../../components/users/UserSearch';
import './UsersPage.sass';
import { BASE_URL } from '../../config';

function UsersPage() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${BASE_URL}/users`);
                if (!response.ok) {
                    throw new Error('Failed to fetch users');
                }
                const usersData = await response.json();
                setUsers(usersData);
                setFilteredUsers(usersData);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, []);

    const handleSearch = (searchTerm) => {
        const lowerCaseTerm = searchTerm.toLowerCase();
        const filtered = users.filter(user => {
            const userName = user.name ? user.name.toLowerCase() : '';
            return userName.includes(lowerCaseTerm);
        });
        setFilteredUsers(filtered);
    };

    return (
        <div className="users-page">
            <h1>Users</h1>
            <UserSearch onSearch={handleSearch} onClear={() => setFilteredUsers(users)} />
            <div className="users-page__list">
                {filteredUsers.map(user => (
                    <UserCard key={user.id} user={user}/>
                ))}
            </div>
        </div>
    );
}

export default UsersPage;
