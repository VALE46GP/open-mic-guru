import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BorderBox from '../shared/BorderBox/BorderBox';
import './Lineup.sass';
import { useWebSocket } from '../../context/WebSocketContext';

function Slot({ slot, onClick, isHost, currentUserId, currentNonUserId }) {
    const canInteract = 
        isHost || // Host can interact with any slot
        (slot.slot_name === "Open") || // Anyone can interact with open slots
        (currentUserId && slot.user_id === currentUserId) || // Logged-in users can only interact with their own slots
        (!currentUserId && slot.non_user_identifier === currentNonUserId); // Non-users can only interact with their own slots

    const slotContent = (
        <div
            className={`lineup__slot ${canInteract ? 'clickable' : ''}`}
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
                    <Link
                        to={`/users/${slot.user_id}`}
                        className="lineup__slot-username"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`View ${slot.slot_name}'s profile`}
                    >
                        {slot.slot_name}
                    </Link>
                ) : (
                    slot.slot_name
                )}
            </div>
        </div>
    );

    return slotContent;
}

function Lineup({ slots, isHost, onSlotClick, onSlotDelete, currentUserId, currentNonUser }) {
    const [showModal, setShowModal] = useState(false);
    const [currentSlot, setCurrentSlot] = useState(null);
    const [currentSlotName, setCurrentSlotName] = useState('');

    const handleSlotClick = (slot) => {
        // First check if the user/non-user already has a slot
        const hasExistingSlot = slots.some(s => {
            if (currentUserId) {
                return s.user_id === currentUserId;
            } else {
                return s.non_user_identifier === currentNonUser?.identifier;
            }
        });

        // If they have an existing slot and they're not the host,
        // only allow them to click their own slot
        if (hasExistingSlot && !isHost) {
            const isOwnSlot = currentUserId 
                ? slot.user_id === currentUserId
                : slot.non_user_identifier === currentNonUser?.identifier;

            if (!isOwnSlot) {
                return;
            }
        }

        setCurrentSlot(slot);
        setCurrentSlotName(slot.slot_name === "Open" ? "" : slot.slot_name);
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
