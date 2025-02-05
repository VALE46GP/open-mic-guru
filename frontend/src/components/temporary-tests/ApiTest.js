import React from 'react';

const SimpleTest = () => {
    const testApi = () => {
        console.log('Testing API connection...');
        fetch('https://api.openmicguru.com/health')
            .then(response => {
                console.log('Response:', response);
                return response.json();
            })
            .then(data => {
                console.log('Data:', data);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    };

    return (
        <div className="p-4">
            <button
                onClick={testApi}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Test API Connection
            </button>
        </div>
    );
};

export default SimpleTest;