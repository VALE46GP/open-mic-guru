export const mockAuthResponses = {
  login: {
    success: {
      token: 'mock-jwt-token',
      user: {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
        social_media_accounts: [],
        image: null
      }
    },
    error: {
      message: 'Invalid credentials',
      status: 401
    },
    networkError: {
      message: 'Network error occurred',
      status: 500
    }
  },
  register: {
    success: {
      token: 'mock-jwt-token',
      user: {
        id: '124',
        name: 'New Test User',
        email: 'newtest@example.com',
        social_media_accounts: [],
        image: null
      }
    },
    error: {
      message: 'Email already exists',
      status: 400
    }
  }
};
