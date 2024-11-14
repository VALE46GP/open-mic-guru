import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BorderBox from '../shared/BorderBox/BorderBox';
import './Lineup.sass';

function Slot({ slot, onClick, isHost, currentUserId, currentNonUserId, slots }) {
    const isOwnSlot = 
        (currentUserId && slot.user_id === currentUserId) || // For logged-in users
        (!currentUserId && slot.non_user_identifier === currentNonUserId); // For non-users

    const hasExistingSlot = () => {
        return slots.some(s => {
            if (currentUserId) {
                return s.user_id === currentUserId;
            } else {
                return s.non_user_identifier === currentNonUserId;
            }
        });
    };

    const canInteract = 
        isHost || // Host can interact with any slot
        isOwnSlot || // Users/non-users can interact with their own slots
        (slot.slot_name === "Open" && !hasExistingSlot()); // Can interact with open slots only if they don't have a slot

    const getSlotClass = () => {
        if (!canInteract) return 'lineup__slot';
        
        // If it's an open slot
        if (slot.slot_name === "Open") {
            // Only show green border if host or user hasn't taken a slot yet
            if (isHost || !hasExistingSlot()) {
                return 'lineup__slot lineup__slot--open clickable';
            }
            return 'lineup__slot';
        }
        
        // For assigned slots that are clickable
        return 'lineup__slot lineup__slot--assigned clickable';
    };

    const slotContent = (
        <div
            className={getSlotClass()}
            onClick={canInteract ? onClick : undefined}
            style={{ cursor: canInteract ? 'pointer' : 'default' }}
            role="button"
            tabIndex={0}
        >
            <div className="lineup__slot-number">{slot.slot_number}</div>
            <div className="lineup__slot-time">
                {new Date(slot.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="lineup__slot-artist">
                {slot.user_id ? (
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
                            <img 
                                src={slot.user_image} 
                                alt={`${slot.slot_name}'s profile`} 
                                className="lineup__slot-user-image"
                            />
                        )}
                    </>
                ) : (
                    slot.slot_name
                )}
            </div>
        </div>
    );

    return slotContent;
}

function Lineup({ slots, isHost, onSlotClick, onSlotDelete, currentUserId, currentNonUser, userName }) {
    const [showModal, setShowModal] = useState(false);
    const [currentSlot, setCurrentSlot] = useState(null);
    const [currentSlotName, setCurrentSlotName] = useState('');

    const handleSlotClick = (slot) => {
        const isOwnSlot = currentUserId 
            ? slot.user_id === currentUserId
            : slot.non_user_identifier === currentNonUser?.identifier;

        // If they have an existing slot and they're not the host,
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
        setCurrentSlotName(currentUserId ? userName : (slot.slot_name === "Open" ? "" : slot.slot_name));
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

    return (
        <BorderBox>
            <h2 className="lineup__title">Lineup</h2>
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
                                >
                                    Sign Up
                                </button>
                            </>
                        )}
                        <button onClick={handleOverlayClick}>Cancel</button>
                    </div>
                </div>
            )}
            <div className="lineup__slots">
                {slots.map((slot, index) => (
                    <Slot
                        key={index}
                        slot={slot}
                        slots={slots}
                        onClick={() => handleSlotClick(slot)}
                        isHost={isHost}
                        currentUserId={currentUserId}
                        currentNonUserId={currentNonUser?.identifier}
                    />
                ))}
            </div>
        </BorderBox>
    );
}

export default Lineup;
