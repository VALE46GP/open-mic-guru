module.exports = {
    testEnvironment: 'node',
    verbose: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js'
    ],
    testMatch: [
        '**/tests/**/*.js',
        '**/?(*.)+(spec|test).js'
    ]
};
