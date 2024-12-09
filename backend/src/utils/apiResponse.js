const createApiResponse = (data, message = null) => ({
    success: true,
    message,
    data
});

const createErrorResponse = (message, status = 500) => ({
    success: false,
    message,
    status
});

module.exports = {
    createApiResponse,
    createErrorResponse
}; 