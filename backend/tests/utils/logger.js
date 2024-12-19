// utils/logger.js
const isTest = process.env.NODE_ENV === 'test';

const logger = {
    error: (...args) => {
        if (!isTest) console.error(...args);
    },
    log: (...args) => {
        if (!isTest) console.log(...args);
    }
};

module.exports = { logger };