export const mockAuthResponses = {
  login: {
    success: {
      token: 'mock-jwt-token',
      user: {
        id: '123',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    error: {
      message: 'Invalid credentials',
      status: 401
    }
  }
};
