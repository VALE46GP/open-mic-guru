const crypto = require('crypto');

class TokenUtility {
    /**
     * Generate a random token for email verification or password reset
     * @param {number} bytes - Number of bytes for token generation
     * @returns {string} Generated token
     */
    static generateToken(bytes = 32) {
        return crypto.randomBytes(bytes).toString('hex');
    }

    /**
     * Generate expiration timestamp for a token
     * @param {number} hours - Number of hours until expiration
     * @returns {Date} Expiration timestamp
     */
    static generateExpirationTime(hours = 24) {
        return new Date(Date.now() + (hours * 60 * 60 * 1000));
    }

    /**
     * Check if a timestamp is expired
     * @param {Date} timestamp - Timestamp to check
     * @returns {boolean} True if expired
     */
    static isExpired(timestamp) {
        return new Date() > new Date(timestamp);
    }
}

module.exports = TokenUtility;