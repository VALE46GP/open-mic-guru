import { useState, useEffect } from 'react';

const ApiTest = () => {
    const [status, setStatus] = useState('Testing connection...');
    const API_URL = 'https://api.openmicguru.com';

    useEffect(() => {
        const testConnection = async () => {
            try {
                const response = await fetch(`${API_URL}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    setStatus('Connected successfully to API');
                } else {
                    setStatus(`Failed to connect: ${response.status}`);
                }
            } catch (error) {
                setStatus(`Connection error: ${error.message}`);
            }
        };

        testConnection();
    }, []);

    return (
        <div className="p-4 border rounded">
            <h2 className="text-xl font-bold mb-4">API Connection Status</h2>
            <div className={`p-2 rounded ${status.includes('success') ? 'bg-green-100' : 'bg-red-100'}`}>
                {status}
            </div>
        </div>
    );
};

export default ApiTest;
