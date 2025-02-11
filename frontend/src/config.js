export const BASE_URL = process.env.NODE_ENV === 'development'
    ? '/api'
    : process.env.REACT_APP_API_URL;