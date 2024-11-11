import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as DeleteIcon } from '../../assets/icons/delete.svg';
import BorderBox from '../shared/BorderBox/BorderBox';
import './Lineup.sass';

function Slot({ slot, onClick, onDelete, isHost }) {
    const slotContent = (
        <div
            className={`lineup__slot ${slot.slot_name === "Open" ? 'clickable' : ''}`}
            onClick={slot.slot_name === "Open" ? onClick : undefined}
            style={{ cursor: slot.slot_name === "Open" ? 'pointer' : 'default' }}
            role="button"
            tabIndex={0}
        >
            <div className="lineup__slot-number">{slot.slot_number}</div>
            <div className="lineup__slot-time">
                {slot.slot_start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="lineup__slot-artist">
                {slot.slot_name}
                {isHost && (
                    <div
                        className="lineup__button lineup__button--delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(slot.slot_id);
                        }}
                        role="button"
                        tabIndex={0}
                    >
                        <DeleteIcon />
                    </div>
                )}
            </div>
        </div>
    );

    return slot.user_id ? (
        <Link
            to={`/users/${slot.user_id}`}
            className="lineup__slot-link"
            style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
            }}
        >
            {slotContent}
        </Link>
    ) : (
        slotContent
    );
}

function Lineup({ slots, isHost, onSlotClick, onSlotDelete }) {
    const [showModal, setShowModal] = useState(false);
    const [currentSlot, setCurrentSlot] = useState(null);
    const [currentSlotName, setCurrentSlotName] = useState('');

    const handleSlotClick = (slot) => {
        if (slot.slot_name === "Open") {
            setCurrentSlot(slot);
            setShowModal(true);
        }
    };

    const handleOverlayClick = () => {
        setShowModal(false);
        setCurrentSlot(null);
    };

    const handleConfirmSignUp = () => {
        onSlotClick(currentSlot, currentSlotName);
        setShowModal(false);
        setCurrentSlotName('');
    };

    return (
        <BorderBox>
            <h2 className="lineup__title">Lineup</h2>
            {showModal && (
                <div className="lineup__modal" onClick={handleOverlayClick}>
                    <div className="lineup__modal-content" onClick={e => e.stopPropagation()}>
                        <p>Slot #{currentSlot.slot_number} is currently open.</p>
                        <p>Estimated start time: {new Date(currentSlot.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <input
                            type="text"
                            placeholder="Enter a name to sign up."
                            value={currentSlotName}
                            onChange={(e) => setCurrentSlotName(e.target.value)}
                        />
                        <button onClick={handleConfirmSignUp} disabled={!currentSlotName.trim() || currentSlotName === "Open"}>Sign Up</button>
                        <button onClick={() => setShowModal(false)}>Cancel</button>
                    </div>
                </div>
            )}
            <div className="lineup__slots">
                {slots.map((slot, index) => (
                    <Slot
                        key={index}
                        slot={slot}
                        onClick={() => handleSlotClick(slot)}
                        onDelete={onSlotDelete}
                        isHost={isHost}
                    />
                ))}
            </div>
        </BorderBox>
    );
}

export default Lineup;
