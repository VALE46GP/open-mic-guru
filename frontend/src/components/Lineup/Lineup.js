import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BorderBox from '../shared/BorderBox/BorderBox';
import './Lineup.sass';

function Slot({ slot, onClick, isHost, currentUserId }) {
    const isOwnSlot = slot.user_id === currentUserId;
    const slotContent = (
        <div
            className={`lineup__slot ${(slot.slot_name === "Open" || isHost || isOwnSlot) ? 'clickable' : ''}`}
            onClick={(slot.slot_name === "Open" || isHost || isOwnSlot) ? onClick : undefined}
            style={{ cursor: (slot.slot_name === "Open" || isHost || isOwnSlot) ? 'pointer' : 'default' }}
            role="button"
            tabIndex={0}
        >
            <div className="lineup__slot-number">{slot.slot_number}</div>
            <div className="lineup__slot-time">
                {slot.slot_start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

function Lineup({ slots, isHost, onSlotClick, onSlotDelete, currentUserId }) {
    const [showModal, setShowModal] = useState(false);
    const [currentSlot, setCurrentSlot] = useState(null);
    const [currentSlotName, setCurrentSlotName] = useState('');

    const handleSlotClick = (slot) => {
        const isOwnSlot = slot.user_id === currentUserId;
        if (slot.slot_name === "Open" || isHost || isOwnSlot) {
            setCurrentSlot(slot);
            setShowModal(true);
        }
    };

    const handleOverlayClick = () => {
        setShowModal(false);
        setCurrentSlot(null);
        setCurrentSlotName('');
    };

    const handleConfirmSignUp = () => {
        onSlotClick(currentSlot, currentSlotName);
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
                    />
                ))}
            </div>
        </BorderBox>
    );
}

export default Lineup;
