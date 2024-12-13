process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://postgres:test@localhost:5432/open_mic_guru_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.CALLBACK_URL = 'http://localhost:3001/auth/google/callback';
