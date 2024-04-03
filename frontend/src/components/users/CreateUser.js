import React, { useState } from 'react';
import { useDatabaseData } from '../../context/DatabaseContext';

function CreateUser() {
    const [newUserName, setNewUserName] = useState('');
    const { updateDatabaseData, databaseData } = useDatabaseData();

    const handleCreateUser = async () => {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newUserName }),
            });
            const data = await response.json();
            updateDatabaseData({
              ...databaseData,
              users: [...databaseData.users, data]
            });
            setNewUserName('');
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    return (
        <div>
            <h2>Create a New User</h2>
            <input
                type="text"
                placeholder="Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
            />
            <button className="submit-button" onClick={handleCreateUser}>Submit</button>
        </div>
    );
}

export default CreateUser;
