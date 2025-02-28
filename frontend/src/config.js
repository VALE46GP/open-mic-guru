const apiUrl = process.env.NODE_ENV === 'development'
    ? '/api'
    : process.env.REACT_APP_API_URL || 'https://api.openmicguru.com';

console.log('API URL:', apiUrl);
export const BASE_URL = apiUrl;