import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import Lineup from './Lineup';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import BorderBox from '../shared/BorderBox/BorderBox';

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
    DragDropContext: ({ children, onDragEnd }) => children,
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

// Mock sample slots data
const mockSlots = [
    {
        slot_id: 1,
        slot_number: 1,
        slot_name: "Open",
        user_id: null,
        user_image: null,
        slot_start_time: "2024-02-01T19:00:00Z",
        slot_duration: { minutes: 10 },
        setup_duration: { minutes: 5 }
    },
    {
        slot_id: 2,
        slot_number: 2,
        slot_name: "John Doe",
        user_id: "123",
        user_image: "profile.jpg",
        slot_start_time: "2024-02-01T19:15:00Z",
        slot_duration: { minutes: 10 },
        setup_duration: { minutes: 5 }
    }
];

// Global fetch mock
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
    })
);

const renderLineup = (props = {}) => {
    const defaultProps = {
        slots: mockSlots,
        isHost: false,
        onSlotClick: jest.fn(),
        onSlotDelete: jest.fn(),
        currentUserId: null,
        currentNonUser: null,
        userName: null,
        isEventActive: true,
        ...props
    };

    return render(
        <MemoryRouter>
            <Lineup {...defaultProps} />
        </MemoryRouter>
    );
};

describe('Lineup Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
        cleanup(); // Add this
    });

    it('renders lineup title and slots', () => {
        renderLineup();
        expect(screen.getByText('Lineup')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
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
            slots: mockSlots,
            currentUserId: null // Explicitly set no current user
        });

        const filledSlot = screen.getByText('John Doe');
        await act(async () => {
            fireEvent.click(filledSlot.closest('.lineup__slot')); // Click the slot container
        });

        expect(screen.getByTestId('slot-modal')).toBeInTheDocument();
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        expect(onSlotDelete).toHaveBeenCalledWith(2);
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
            slots: mockSlots,
            isHost: false // Explicitly set not host
        });

        const ownedSlot = screen.getByText('John Doe');
        await act(async () => {
            fireEvent.click(ownedSlot.closest('.lineup__slot'));
        });

        expect(screen.getByTestId('slot-modal')).toBeInTheDocument();
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        expect(onSlotDelete).toHaveBeenCalledWith(2);
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
});