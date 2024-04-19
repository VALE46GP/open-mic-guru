import React, { useState } from 'react';

function CreateUser() {
    const [newUserName, setNewUserName] = useState('');

    const handleCreateUser = async () => {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newUserName }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            // Handle the response data as needed, e.g., display a success message
            console.log(data);
            setNewUserName(''); // Reset the input field on successful creation
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
