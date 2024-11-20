import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import BorderBox from '../shared/BorderBox/BorderBox';
import './Lineup.sass';

function Slot({ slot, onClick, isHost, currentUserId, currentNonUserId, slots, isEditing, provided, isDragging }) {
    const isOwnSlot = 
        (currentUserId && slot.user_id === currentUserId) || 
        (!currentUserId && slot.non_user_identifier === currentNonUserId);

    const hasExistingSlot = () => {
        return slots.some(s => {
            if (currentUserId) {
                return s.user_id === currentUserId;
            } else {
                return s.non_user_identifier === currentNonUserId;
            }
        });
    };

    const canInteract = !isEditing && (
        isHost || 
        isOwnSlot || 
        (slot.slot_name === "Open" && !hasExistingSlot())
    );

    const getSlotClass = () => {
        let classes = ['lineup__slot'];
        
        if (isDragging) {
            classes.push('lineup__slot--dragging');
        }
        
        if (!canInteract && !isEditing) return classes.join(' ');
        
        if (slot.slot_name === "Open") {
            if (isHost || !hasExistingSlot()) {
                classes.push('lineup__slot--open');
                if (!isEditing) classes.push('clickable');
            }
        } else {
            if (isOwnSlot) {
                classes.push('lineup__slot--user-slot');
            }
            classes.push('lineup__slot--assigned');
            if (!isEditing) classes.push('clickable');
        }
        
        return classes.join(' ');
    };

    const DragHandle = () => (
        <div className="lineup__slot-drag-handle">
            <div className="lineup__slot-drag-handle-lines">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    );

    const slotContent = (
        <div
            ref={provided?.innerRef}
            {...provided?.draggableProps}
            {...provided?.dragHandleProps}
            className={getSlotClass()}
            onClick={canInteract ? onClick : undefined}
            style={{
                cursor: isEditing ? 'grab' : (canInteract ? 'pointer' : 'default'),
                ...provided?.draggableProps?.style
            }}
            role="button"
            tabIndex={0}
        >
            <div className={`lineup__slot-content ${isEditing ? 'lineup__slot-content--editing' : ''}`}>
                {isEditing && <DragHandle />}
                <div className="lineup__slot-number">{slot.slot_number}</div>
                <div className="lineup__slot-time">
                    {new Date(slot.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="lineup__slot-artist">
                    {slot.user_id ? (
                        <>
                            {isEditing ? (
                                <span className="lineup__slot-username">
                                    {slot.slot_name}
                                </span>
                            ) : (
                                <>
                                    <Link
                                        to={`/users/${slot.user_id}`}
                                        className="lineup__slot-username"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label={`View ${slot.slot_name}'s profile`}
                                    >
                                        {slot.slot_name}
                                    </Link>
                                    {slot.user_image && (
                                        <Link
                                            to={`/users/${slot.user_id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label={`View ${slot.slot_name}'s profile picture`}
                                        >
                                            <img 
                                                src={slot.user_image} 
                                                alt={`${slot.slot_name}'s profile`} 
                                                className="lineup__slot-user-image"
                                            />
                                        </Link>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        slot.slot_name
                    )}
                </div>
            </div>
        </div>
    );

    return slotContent;
}

function Lineup({ slots, isHost, onSlotClick, onSlotDelete, currentUserId, currentNonUser, userName }) {
    const [showModal, setShowModal] = useState(false);
    const [currentSlot, setCurrentSlot] = useState(null);
    const [currentSlotName, setCurrentSlotName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedSlots, setEditedSlots] = useState(slots);
    const [newSlotsCount, setNewSlotsCount] = useState(0);

    useEffect(() => {
        setEditedSlots(slots);
    }, [slots]);

    const handleSlotClick = (slot) => {
        const isOwnSlot = currentUserId 
            ? slot.user_id === currentUserId
            : slot.non_user_identifier === currentNonUser?.identifier;

        // only allow them to click their own slot or prevent clicking open slots
        if (!isHost) {
            const hasExistingSlot = slots.some(s => {
                if (currentUserId) {
                    return s.user_id === currentUserId;
                } else {
                    return s.non_user_identifier === currentNonUser?.identifier;
                }
            });

            if (hasExistingSlot && !isOwnSlot) {
                return; // Prevent interaction if they have a slot and trying to click another
            }
        }

        setCurrentSlot(slot);
        // If host, leave the field empty. Otherwise, use the user's name or current slot name
        setCurrentSlotName(isHost ? "" : (currentUserId ? userName : (slot.slot_name === "Open" ? "" : slot.slot_name)));
        setShowModal(true);
    };

    const handleOverlayClick = () => {
        setShowModal(false);
        setCurrentSlot(null);
        setCurrentSlotName('');
    };

    const handleConfirmSignUp = () => {
        // First check if this is a non-user (no currentUserId)
        if (!currentUserId) {
            // Check if the name is already taken in any slot
            const isNameTaken = slots.some(slot => 
                slot.slot_name.toLowerCase() === currentSlotName.toLowerCase() &&
                slot.slot_number !== currentSlot.slot_number
            );

            if (isNameTaken) {
                alert('That name is already taken. Please choose a different name.');
                return;
            }
        }

        const isHostAssignment = isHost;
        onSlotClick(currentSlot, currentSlotName, isHostAssignment);
        setShowModal(false);
        setCurrentSlotName('');
    };

    const handleDelete = () => {
        onSlotDelete(currentSlot.slot_id);
        setShowModal(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && currentSlotName.trim() && currentSlotName !== "Open") {
            handleConfirmSignUp();
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(editedSlots);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update slot numbers
        const updatedItems = items.map((item, index) => ({
            ...item,
            slot_number: index + 1
        }));

        setEditedSlots(updatedItems);
    };

    const handleAddSlot = () => {
        const newSlot = {
            event_id: slots[0]?.event_id,
            slot_number: editedSlots.length + 1,
            slot_name: "Open",
            user_id: null,
            user_image: null,
            slot_start_time: calculateNewSlotTime(editedSlots.length)
        };
        setEditedSlots([...editedSlots, newSlot]);
        setNewSlotsCount(prev => prev + 1);
    };

    const calculateNewSlotTime = (slotIndex) => {
        const firstSlot = editedSlots[0];
        if (!firstSlot?.slot_start_time) return new Date();
        
        const startTime = new Date(firstSlot.slot_start_time);
        const totalMinutesPerSlot = slots[0]?.slot_duration?.minutes + slots[0]?.setup_duration?.minutes;
        startTime.setMinutes(startTime.getMinutes() + (slotIndex * totalMinutesPerSlot));
        return startTime;
    };

    const handleSave = async () => {
        try {
            // First update any existing slots' order
            if (editedSlots.some(slot => slot.slot_id)) {
                const response = await fetch('/api/lineup_slots/reorder', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        slots: editedSlots
                            .filter(slot => slot.slot_id)
                            .map(slot => ({
                                slot_id: slot.slot_id,
                                slot_number: slot.slot_number
                            }))
                    })
                });

                if (!response.ok) throw new Error('Failed to update slot order');
            }

            // If new slots were added, extend the event duration
            if (newSlotsCount > 0) {
                const eventId = slots[0]?.event_id;
                if (!eventId) throw new Error('Event ID not found');

                const eventUpdateResponse = await fetch(`/api/events/${eventId}/extend`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        additional_slots: newSlotsCount
                    })
                });

                if (!eventUpdateResponse.ok) throw new Error('Failed to update event end time');
            }
            
            setIsEditing(false);
            setNewSlotsCount(0);
        } catch (error) {
            console.error('Error updating slots:', error);
            alert('Failed to save changes');
        }
    };

    const handleCancel = () => {
        setEditedSlots(slots);
        setIsEditing(false);
    };

    return (
        <BorderBox onEdit={isHost ? () => setIsEditing(true) : null}>
            <h2 className="lineup__title">Lineup</h2>
            {isEditing && (
                <div className="lineup__edit-controls">
                    <button onClick={handleSave}>Save</button>
                    <button onClick={handleCancel}>Cancel</button>
                </div>
            )}
            
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="lineup">
                    {(provided) => (
                        <div 
                            className="lineup__slots"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {editedSlots.map((slot, index) => (
                                <Draggable 
                                    key={`slot-${slot.slot_number}-${slot.slot_id || 'open'}`}
                                    draggableId={`slot-${slot.slot_number}-${slot.slot_id || 'open'}`}
                                    index={index}
                                    isDragDisabled={!isEditing}
                                >
                                    {(provided, snapshot) => (
                                        <Slot
                                            slot={slot}
                                            slots={editedSlots}
                                            onClick={() => handleSlotClick(slot)}
                                            isHost={isHost}
                                            currentUserId={currentUserId}
                                            currentNonUserId={currentNonUser?.identifier}
                                            isEditing={isEditing}
                                            provided={provided}
                                            isDragging={snapshot.isDragging}
                                        />
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {isEditing && (
                <button 
                    className="lineup__add-slot-button"
                    onClick={handleAddSlot}
                >
                    Add Slot
                </button>
            )}

            {showModal && (
                <div className="lineup__modal" onClick={handleOverlayClick}>
                    <div className="lineup__modal-content" onClick={e => e.stopPropagation()}>
                        <p>Slot #{currentSlot.slot_number}</p>
                        <p>Estimated start time: {new Date(currentSlot.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                        {(isHost || currentSlot.user_id === currentUserId) && currentSlot.slot_name !== "Open" ? (
                            <>
                                <p>Current performer: {currentSlot.slot_name}</p>
                                <button
                                    onClick={handleDelete}
                                    className="lineup__modal-button--delete"
                                    aria-label={`Delete slot ${currentSlot.slot_number}`}
                                >
                                    Delete
                                </button>
                            </>
                        ) : (
                            <>
                                <p>This slot is currently {currentSlot.slot_name === "Open" ? "open" : "taken"}.</p>
                                {isHost && !slots.some(s => s.user_id === currentUserId) && (
                                    <button
                                        onClick={() => {
                                            onSlotClick(currentSlot, userName, false);
                                            setShowModal(false);
                                        }}
                                        className="lineup__modal-button--assign-self"
                                    >
                                        Assign Self
                                    </button>
                                )}
                                <input
                                    type="text"
                                    placeholder="Enter a name to sign up."
                                    value={currentSlotName}
                                    onChange={(e) => setCurrentSlotName(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    autoFocus
                                />
                                <button
                                    onClick={handleConfirmSignUp}
                                    disabled={!currentSlotName.trim() || currentSlotName === "Open"}
                                    className="lineup__modal-button--sign-up"
                                >
                                    Sign Up
                                </button>
                            </>
                        )}
                        <button onClick={handleOverlayClick}>Cancel</button>
                    </div>
                </div>
            )}
        </BorderBox>
    );
}

export default Lineup;
