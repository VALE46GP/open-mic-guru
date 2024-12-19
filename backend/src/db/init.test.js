const { mockDb } = require('../../tests/helpers/mockDb');
const initializeDatabase = require('./init');
const tables = require('./schema');

// Mock the database module and its connect method
jest.mock('../db', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn()
  };
  return {
    connect: jest.fn().mockResolvedValue(mockClient)
  };
});

describe('Database Initialization', () => {
  let mockClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Get reference to the mock client for each test
    mockClient = require('../db').connect().then(client => client);
  });

  it('should create all required tables', async () => {
    const client = await mockClient;
    client.query.mockResolvedValue({ rows: [] });

    await initializeDatabase(true);

    // Verify BEGIN was called
    expect(client.query).toHaveBeenCalledWith('BEGIN');

    // Verify each table creation was called
    const tableOrder = ['users', 'venues', 'events', 'lineup_slots', 'notification_preferences', 'notifications', 'links'];
    
    for (const tableName of tableOrder) {
      expect(client.query).toHaveBeenCalledWith(tables[tableName]);
    }

    // Verify COMMIT was called
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('should handle initialization errors', async () => {
    const client = await mockClient;
    client.query.mockRejectedValueOnce(new Error('Database error'));

    await expect(initializeDatabase(true)).rejects.toThrow('Database error');
    expect(client.release).toHaveBeenCalled();
  });
});
