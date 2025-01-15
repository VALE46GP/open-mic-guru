import React from 'react';
import { screen, act } from '@testing-library/react';
import { useWebSocketContext } from './WebSocketContext';
import { renderWithProviders } from '../testUtils/testUtils';
import '@testing-library/jest-dom';

// Test component can stay in the test file since it's specific to this test
function TestComponent() {
    const { lastMessage, isConnected } = useWebSocketContext();
    return (
        <div>
            <span>Connection status: {isConnected ? 'connected' : 'disconnected'}</span>
            <span>{lastMessage ? 'Has message' : 'No message'}</span>
        </div>
    );
}

describe('WebSocketContext', () => {
    it('provides WebSocket context values', async () => {
        await act(async () => {
            renderWithProviders(<TestComponent />);
        });
        
        // Check that the component renders with initial values
        expect(screen.getByText('Connection status: connected')).toBeInTheDocument();
        expect(screen.getByText('No message')).toBeInTheDocument();
    });
}); 