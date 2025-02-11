import React from 'react';
import { screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import Lineup from './Lineup';
import { mockLineupSlots } from '../../testData/mockLineupSlots';
import { renderWithProviders } from '../../testUtils/testUtils';
import { BASE_URL } from '../../config';

// Mock components
jest.mock('../shared/BorderBox/BorderBox', () => {
    return function MockBorderBox({ children, onEdit }) {
        return (
            <div className="border-box">
                {onEdit && (
                    <button onClick={onEdit} aria-label="Edit">
                        Edit
                    </button>
                )}
                {children}
            </div>
        );
    };
});

jest.mock('@hello-pangea/dnd', () => ({
    DragDropContext: ({ children }) => children,
    Droppable: ({ children }) => children({
        innerRef: () => {},
        droppableProps: {},
        placeholder: null
    }),
    Draggable: ({ children }) => children({
        innerRef: () => {},
        draggableProps: {},
        dragHandleProps: {},
    }, {
        isDragging: false
    })
}));

// Global fetch mock
const debugFetch = (url, options) => {
    return Promise.resolve({
        ok: true,
        json: () => {
            if (url.includes('/status')) {
                return Promise.resolve({ is_signup_open: true });
            }
            if (url.includes('/toggle-signup')) {
                return Promise.resolve({ success: true, is_signup_open: false });
            }
            return Promise.resolve({});
        }
    });
};

const renderLineup = (props = {}) => {
    const defaultProps = {
        slots: mockLineupSlots,
        eventId: '1',
        isHost: false,
        currentUserId: '19',
        userName: 'Admin 3.0',
        isEventActive: true,
        isSignupOpen: true,
        ...props
    };

    return renderWithProviders(<Lineup {...defaultProps} />);
};

describe('Lineup Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn(debugFetch);
    });

    afterEach(cleanup);

    it('renders lineup title and slots', () => {
        renderLineup();
        expect(screen.getByText('Lineup')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
    });

    it('shows edit controls when user is host', async () => {
        renderLineup({ isHost: true });

        const editButton = screen.getByLabelText('Edit');
        await act(async () => {
            fireEvent.click(editButton);
        });

        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('allows host to add new slot', async () => {
        renderLineup({ isHost: true });

        const editButton = screen.getByLabelText('Edit');
        await act(async () => {
            fireEvent.click(editButton);
        });

        const addButton = screen.getByText('Add Slot');
        await act(async () => {
            fireEvent.click(addButton);
        });

        const openSlots = screen.getAllByText('Open');
        expect(openSlots).toHaveLength(2);
    });

    it('shows signup modal for open slot', async () => {
        const onSlotClick = jest.fn();
        renderLineup({ onSlotClick });

        const openSlot = screen.getByText('Open');
        await act(async () => {
            fireEvent.click(openSlot);
        });

        expect(screen.getByPlaceholderText('Enter a name to sign up.')).toBeInTheDocument();
    });

    it('prevents signup when user already has a slot', () => {
        renderLineup({ currentUserId: '123' });
        const openSlot = screen.getByText('Open');
        fireEvent.click(openSlot);
        expect(screen.queryByPlaceholderText('Enter a name to sign up.')).not.toBeInTheDocument();
    });

    it('allows host to delete slots', async () => {
        const onSlotDelete = jest.fn();

        renderLineup({
            isHost: true,
            onSlotDelete,
            slots: mockLineupSlots,
            currentUserId: null
        });

        const filledSlots = screen.getAllByText('John Doe');
        await act(async () => {
            fireEvent.click(filledSlots[1].closest('.lineup__slot')); // Click the second John Doe slot
        });

        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        expect(onSlotDelete).toHaveBeenCalledWith(3);
    });

    it('shows Assign Self button for host without slot', async () => {
        renderLineup({ isHost: true, currentUserId: '456' });

        const openSlot = screen.getByText('Open');
        await act(async () => {
            fireEvent.click(openSlot);
        });

        expect(screen.getByText('Assign Self')).toBeInTheDocument();
    });

    it('prevents interaction with inactive events', async () => {
        const onSlotClick = jest.fn();
        renderLineup({ isEventActive: false, onSlotClick });

        const openSlot = screen.getByText('Open');
        await act(async () => {
            fireEvent.click(openSlot);
        });

        expect(onSlotClick).not.toHaveBeenCalled();
    });

    it('allows slot owner to delete their own slot', async () => {
        const onSlotDelete = jest.fn();

        renderLineup({
            currentUserId: '123',
            onSlotDelete,
            slots: mockLineupSlots,
            isHost: false
        });

        await act(async () => {
            const ownedSlot = screen.getAllByText('John Doe')[0]; // Get first John Doe slot
            fireEvent.click(ownedSlot.closest('.lineup__slot'));
        });

        const modal = await screen.findByTestId('slot-modal');
        expect(modal).toBeInTheDocument();
        
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        expect(onSlotDelete).toHaveBeenCalledWith(1);
    });

    it('handles keyboard interaction for signup', async () => {
        const onSlotClick = jest.fn();
        renderLineup({ onSlotClick });

        const openSlot = screen.getByText('Open');
        await act(async () => {
            fireEvent.click(openSlot);
        });

        const input = screen.getByPlaceholderText('Enter a name to sign up.');
        await act(async () => {
            fireEvent.change(input, { target: { value: 'New Performer' } });
            fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });
        });

        expect(onSlotClick).toHaveBeenCalled();
    });

    it('allows host to toggle signup status', async () => {
        global.fetch = jest.fn(debugFetch);
        
        renderLineup({ 
            isHost: true, 
            eventId: '123',
            slots: mockLineupSlots.map(slot => ({
                ...slot,
                event_id: '123'
            }))
        });

        const toggleSwitch = screen.getByRole('checkbox');
        
        await act(async () => {
            fireEvent.click(toggleSwitch);
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${BASE_URL}/lineup_slots/123/toggle-signup`,
                expect.objectContaining({
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: expect.any(String)
                })
            );
        });
    });
});

