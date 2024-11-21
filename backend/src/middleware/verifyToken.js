const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ error: 'Token missing or invalid' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Token verification failed:', err.message);
            return res.status(403).json({ error: 'Invalid token' });
        }

        // Attach decoded token to `req.user`
        req.user = decoded;
        console.log('Token verified successfully:', decoded);
        next();
    });
};

module.exports = verifyToken;
