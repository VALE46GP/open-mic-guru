import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import Lineup from './Lineup';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Mock hello-pangea/dnd
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

    it('renders lineup title and slots', () => {
        renderLineup();

        expect(screen.getByText('Lineup')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('shows edit controls when user is host', () => {
        renderLineup({ isHost: true });

        const editButton = screen.getByLabelText('Edit');
        fireEvent.click(editButton);

        expect(screen.getByText('Save')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Consolidate')).toBeInTheDocument();
    });

    it('allows host to add new slot', async () => {
        renderLineup({ isHost: true });

        const editButton = screen.getByLabelText('Edit');
        fireEvent.click(editButton);

        const addButton = screen.getByText('Add Slot');
        fireEvent.click(addButton);

        expect(screen.getAllByText('Open')).toHaveLength(2);
    });

    it('shows signup modal for open slot', async () => {
        const onSlotClick = jest.fn();
        renderLineup({ onSlotClick });

        const openSlot = screen.getByText('Open');
        fireEvent.click(openSlot);

        expect(screen.getByText(/this slot is currently open/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter a name to sign up.')).toBeInTheDocument();
    });

    it('handles slot signup', async () => {
        const onSlotClick = jest.fn();
        renderLineup({ onSlotClick });

        // Click open slot
        const openSlot = screen.getByText('Open');
        fireEvent.click(openSlot);

        // Enter name
        const input = screen.getByPlaceholderText('Enter a name to sign up.');
        fireEvent.change(input, { target: { value: 'New Performer' } });

        // Click signup
        const signupButton = screen.getByText('Sign Up');
        fireEvent.click(signupButton);

        expect(onSlotClick).toHaveBeenCalledWith(
            expect.objectContaining({ slot_number: 1 }),
            'New Performer',
            false
        );
    });

    it('prevents signup when user already has a slot', () => {
        renderLineup({ currentUserId: '123' });

        const openSlot = screen.getByText('Open');
        fireEvent.click(openSlot);

        expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    });

    it('allows host to delete slots', async () => {
        const onSlotDelete = jest.fn();
        renderLineup({ isHost: true, onSlotDelete });

        // Click filled slot
        const filledSlot = screen.getByText('John Doe');
        fireEvent.click(filledSlot);

        // Click delete
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        expect(onSlotDelete).toHaveBeenCalledWith(2);
    });

    it('shows Assign Self button for host without slot', () => {
        renderLineup({ isHost: true, currentUserId: '456' });

        const openSlot = screen.getByText('Open');
        fireEvent.click(openSlot);

        expect(screen.getByText('Assign Self')).toBeInTheDocument();
    });

    it('prevents interaction with slots when event is not active', () => {
        renderLineup({ isEventActive: false });

        const openSlot = screen.getByText('Open');
        fireEvent.click(openSlot);

        expect(screen.queryByText(/this slot is currently open/i)).not.toBeInTheDocument();
    });

    it('allows slot owner to delete their own slot', () => {
        const onSlotDelete = jest.fn();
        renderLineup({ currentUserId: '123', onSlotDelete });

        const ownedSlot = screen.getByText('John Doe');
        fireEvent.click(ownedSlot);

        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);

        expect(onSlotDelete).toHaveBeenCalledWith(2);
    });

    it('consolidates slots correctly', async () => {
        renderLineup({ isHost: true });

        // Enter edit mode
        const editButton = screen.getByLabelText('Edit');
        fireEvent.click(editButton);

        // Click consolidate
        const consolidateButton = screen.getByText('Consolidate');
        fireEvent.click(consolidateButton);

        // Verify slot numbers are sequential
        const slotNumbers = screen.getAllByText(/^[0-9]+$/).map(el => parseInt(el.textContent));
        expect(slotNumbers).toEqual([1, 2]);
    });

    it('handles keyboard interaction for signup', async () => {
        const onSlotClick = jest.fn();
        renderLineup({ onSlotClick });

        // Open modal
        const openSlot = screen.getByText('Open');
        fireEvent.click(openSlot);

        // Enter name and press Enter
        const input = screen.getByPlaceholderText('Enter a name to sign up.');
        fireEvent.change(input, { target: { value: 'New Performer' } });
        fireEvent.keyPress(input, { key: 'Enter', code: 13, charCode: 13 });

        expect(onSlotClick).toHaveBeenCalledWith(
            expect.objectContaining({ slot_number: 1 }),
            'New Performer',
            false
        );
    });
});