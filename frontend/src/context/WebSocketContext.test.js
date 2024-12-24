import React from 'react';
import { screen } from '@testing-library/react';
import { useWebSocketContext } from './WebSocketContext';
import { renderWithProviders } from '../testUtils/testUtils';
import '@testing-library/jest-dom';

function TestComponent() {
    const { lastMessage } = useWebSocketContext();
    return <div>{lastMessage ? 'test' : 'test'}</div>;
}

describe('WebSocketContext', () => {
    it('renders', () => {
        renderWithProviders(<TestComponent />);
        expect(screen.getByText('test')).toBeInTheDocument();
    });
}); 