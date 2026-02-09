/**
 * Simple Logger Utility
 * Provides consistent logging with timestamps
 * Can be extended to use winston/pino for production
 */
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
};

const getTimestamp = () => new Date().toISOString();

const logger = {
    info: (message, data = '') => {
        console.log(`${colors.green}[INFO]${colors.reset} ${getTimestamp()} - ${message}`, data);
    },

    warn: (message, data = '') => {
        console.log(`${colors.yellow}[WARN]${colors.reset} ${getTimestamp()} - ${message}`, data);
    },

    error: (message, data = '') => {
        console.log(`${colors.red}[ERROR]${colors.reset} ${getTimestamp()} - ${message}`, data);
    },

    debug: (message, data = '') => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`${colors.cyan}[DEBUG]${colors.reset} ${getTimestamp()} - ${message}`, data);
        }
    },
};

module.exports = logger;
