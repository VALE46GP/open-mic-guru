const jwt = require('jsonwebtoken');
const { logger } = require('../../tests/utils/logger');

const verifyToken = (req, res, next) => {
    console.log('verifyToken called with headers:', req.headers);
    
    // Check both Authorization header and cookie
    const authHeader = req.headers['authorization'];
    const cookieToken = req.cookies?.token;
    
    // Try Authorization header first, then cookie
    const token = (authHeader && authHeader.split(' ')[1]) || cookieToken;

    if (!token) {
        console.log('Token missing from both header and cookie');
        return res.status(401).json({ error: 'Token missing or invalid' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('Token verification failed:', err.message);
            logger.error('Token verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }

        console.log('Token verified, decoded:', decoded);
        req.user = decoded;
        next();
    });
};

module.exports = verifyToken;
