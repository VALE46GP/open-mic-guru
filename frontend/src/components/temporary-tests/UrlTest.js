import { useState, useEffect } from 'react';

const UrlTest = () => {
    const [tests, setTests] = useState([]);
    const urls = [
        'https://api.openmicguru.com/health',
        'http://api.openmicguru.com/health',
        `${window.location.protocol}//api.openmicguru.com/health`
    ];

    useEffect(() => {
        const runTests = async () => {
            const results = await Promise.all(
                urls.map(async (url) => {
                    try {
                        const start = Date.now();
                        const response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        const time = Date.now() - start;
                        return {
                            url,
                            status: response.ok ? 'Success' : `Failed: ${response.status}`,
                            time: `${time}ms`
                        };
                    } catch (error) {
                        return {
                            url,
                            status: `Error: ${error.message}`,
                            time: 'N/A'
                        };
                    }
                })
            );
            setTests(results);
        };

        runTests();
    }, []);

    return (
        <div className="p-4 border rounded">
            <h2 className="text-xl font-bold mb-4">API URL Tests</h2>
            <div className="space-y-2">
                {tests.map((test, index) => (
                    <div key={index} className="p-2 border rounded">
                        <div className="font-medium">URL: {test.url}</div>
                        <div className={`text-sm ${test.status.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                            Status: {test.status}
                        </div>
                        <div className="text-sm text-gray-600">Response Time: {test.time}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UrlTest;