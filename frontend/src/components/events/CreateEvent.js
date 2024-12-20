// src/components/events/CreateEvent.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import VenueAutocomplete from '../shared/VenueAutocomplete';
import TextInput from '../shared/TextInput';
import LocationMap from '../shared/LocationMap';
import './CreateEvent.sass';
import BorderBox from '../shared/BorderBox/BorderBox';
import axios from 'axios';

function CreateEvent() {
    const { eventId } = useParams();
    const [eventData, setEventData] = useState(null);
    const [newEventName, setNewEventName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [slotDuration, setSlotDuration] = useState('10');
    const [setupDuration, setSetupDuration] = useState('5');
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [resetTrigger, setResetTrigger] = useState(false);
    const { getToken, getUserId, authenticatedFetch } = useAuth();
    const navigate = useNavigate();
    const isEditMode = !!eventId;
    const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
    const [eventImage, setEventImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [eventTypes, setEventTypes] = useState([]);
    const [isEventActive, setIsEventActive] = useState(true);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState(false);

    const EVENT_TYPE_OPTIONS = [
        { label: 'Music', value: 'music' },
        { label: 'Comedy', value: 'comedy' },
        { label: 'Spoken Word', value: 'spoken_word' },
        { label: 'Other', value: 'other' }
    ];

    useEffect(() => {
        if (eventId) {
            const fetchEventDetails = async () => {
                try {
                    const response = await fetch(`/api/events/${eventId}`);
                    const { data } = await response.json();
                    
                    if (data.event) {
                        setEventData(data);
                        setNewEventName(data.event.name || '');
                        setAdditionalInfo(data.event.additional_info || '');
                        setEventTypes(data.event.event_types || []);
                        setIsEventActive(data.event.active ?? true);

                        if (data.event.image) {
                            setImagePreview(data.event.image);
                            setEventImage(data.event.image);
                        }

                        if (data.event.start_time) {
                            const date = new Date(data.event.start_time);
                            const localDateString = date.getFullYear() + '-' +
                                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                String(date.getDate()).padStart(2, '0') + 'T' +
                                String(date.getHours()).padStart(2, '0') + ':' +
                                String(date.getMinutes()).padStart(2, '0');
                            setStartTime(localDateString);
                        }

                        if (data.event.end_time) {
                            const date = new Date(data.event.end_time);
                            const localDateString = date.getFullYear() + '-' +
                                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                                String(date.getDate()).padStart(2, '0') + 'T' +
                                String(date.getHours()).padStart(2, '0') + ':' +
                                String(date.getMinutes()).padStart(2, '0');
                            setEndTime(localDateString);
                        }

                        setSlotDuration(data.event.slot_duration?.minutes 
                            ? data.event.slot_duration.minutes.toString() 
                            : '10');
                        
                        setSetupDuration(data.event.setup_duration?.minutes 
                            ? data.event.setup_duration.minutes.toString() 
                            : '5');

                        if (data.venue) {
                            setSelectedVenue({
                                name: data.venue.name,
                                address: data.venue.address,
                                latitude: data.venue.latitude,
                                longitude: data.venue.longitude,
                                geometry: {
                                    location: {
                                        lat: () => data.venue.latitude,
                                        lng: () => data.venue.longitude
                                    }
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching event details:', error);
                }
            };

            fetchEventDetails();
        }
    }, [eventId]);

    useEffect(() => {
        // Avoid using `setInterval` in the test environment.
        if (process.env.NODE_ENV !== 'test') {
            const checkGoogleMapsLoaded = setInterval(() => {
                if (window.google && window.google.maps && !isGoogleMapsLoaded) {
                    clearInterval(checkGoogleMapsLoaded);
                    setIsGoogleMapsLoaded(true);
                }
            }, 100);

            return () => clearInterval(checkGoogleMapsLoaded);
        } else {
            setIsGoogleMapsLoaded(true); // Directly set as loaded in tests
        }
    }, []);

    useEffect(() => {
        if (selectedVenue && selectedVenue.address_components) {
            const formattedAddress = selectedVenue.address_components.map(ac => ac.short_name).join(', ');
            const latitude = selectedVenue.geometry.location.lat();
            const longitude = selectedVenue.geometry.location.lng();
            setSelectedVenue({
                name: selectedVenue?.name || '',
                address: formattedAddress || '',
                latitude: latitude || 0,
                longitude: longitude || 0
            });
        }
    }, [selectedVenue]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            setEventImage(file);
        }
    };

    const handleSubmit = async () => {
        if (!selectedVenue) {
            alert("Please select a location from the dropdown.");
            return;
        }
        if (new Date(startTime) >= new Date(endTime)) {
            alert("Start time must be before end time.");
            return;
        }

        // If there's a pending status change, show the confirmation modal
        if (pendingStatusChange) {
            setShowStatusModal(true);
            return;
        }

        await saveEvent();
    };

    const saveEvent = async () => {
        let venueId = await checkOrCreateVenue(selectedVenue);
        let imageUrl = eventImage;

        if (eventImage && eventImage instanceof File) {
            try {
                const response = await authenticatedFetch('/api/events/upload', {
                    method: 'POST',
                    body: JSON.stringify({
                        fileName: eventImage.name,
                        fileType: eventImage.type
                    })
                });
                const data = await response.json();
                
                await axios.put(data.uploadURL, eventImage, {
                    headers: { 'Content-Type': eventImage.type }
                });
                imageUrl = data.uploadURL.split('?')[0];
            } catch (error) {
                console.error('Error uploading image:', error);
                return;
            }
        }

        const url = isEditMode ? `/api/events/${eventId}` : '/api/events';
        const method = isEditMode ? 'PATCH' : 'POST';

        try {
            const response = await authenticatedFetch(url, {
                method,
                body: JSON.stringify({
                    name: newEventName,
                    venue_id: venueId,
                    start_time: (() => {
                        const [datePart, timePart] = startTime.split('T');
                        const [year, month, day] = datePart.split('-');
                        const [hours, minutes] = timePart.split(':');
                        // Create date in UTC
                        return new Date(Date.UTC(year, month - 1, day, hours, minutes)).toISOString();
                    })(),
                    end_time: (() => {
                        const [datePart, timePart] = endTime.split('T');
                        const [year, month, day] = datePart.split('-');
                        const [hours, minutes] = timePart.split(':');
                        return new Date(Date.UTC(year, month - 1, day, hours, minutes)).toISOString();
                    })(),
                    slot_duration: slotDuration * 60,
                    setup_duration: setupDuration * 60,
                    additional_info: additionalInfo,
                    host_id: getUserId(),
                    image: imageUrl,
                    types: eventTypes,
                    active: pendingStatusChange ? !isEventActive : isEventActive
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save event');
            }

            const data = await response.json();
            setShowStatusModal(false);
            setPendingStatusChange(false);
            navigate(`/events/${isEditMode ? eventId : data.id}`);
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Failed to save event');
        }
    };

    const handleResetComplete = () => {
        setResetTrigger(false);
    };

    async function checkOrCreateVenue(selectedVenue) {
        const address = selectedVenue.address_components ? selectedVenue.address_components.map(component => component.short_name).join(', ') : '';
        const venueData = {
            name: selectedVenue.name,
            address: address,
            latitude: selectedVenue.latitude,
            longitude: selectedVenue.longitude,
        };

        try {
            const response = await fetch('/api/venues/checkOrCreate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(venueData),
            });
            const data = await response.json();
            return data.venueId;
        } catch (error) {
            console.error('Error checking or creating venue:', error);
            return null;
        }
    }

    const handleEventStatusToggle = () => {
        setPendingStatusChange(prev => !prev);
    };

    const handleConfirmStatusChange = async () => {
        await saveEvent();
    };

    return (
        <div className="create-event">
            <h1 className="create-event__title">{isEditMode ? 'Edit Your Event' : 'Create a New Event'}</h1>
            <div className="create-event__container">
                <BorderBox maxWidth="600px">
                    <h2 className="create-event__title">Details</h2>
                    <div className="create-event__form-content">
                        <div className="create-event__input-field">
                            <label htmlFor="event-name">Event Name</label>
                            <TextInput
                                id="event-name"
                                placeholder="Event Name"
                                value={newEventName}
                                onChange={(e) => setNewEventName(e.target.value)}
                            />
                        </div>
                        <div className="create-event__input-field">
                            <label htmlFor="start-time">Start Time</label>
                            <TextInput
                                id="start-time"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => {
                                    setStartTime(e.target.value);
                                    if (!isEditMode) {
                                        // Add one hour to the selected time only if not in edit mode
                                        const endDateTime = e.target.value.slice(0, -5) + (parseInt(e.target.value.slice(-5, -3)) + 1).toString().padStart(2, '0') + ":00";
                                        setEndTime(endDateTime);
                                    }
                                }}
                            />
                        </div>
                        <div className="create-event__input-field">
                            <label htmlFor="end-time">End Time</label>
                            <TextInput
                                id="end-time"
                                type="datetime-local"
                                value={endTime || startTime} // Set to startTime if endTime is not set
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                        <div className="create-event__input-field">
                            <label htmlFor="slot-duration">Slot Duration (minutes)</label>
                            <TextInput
                                id="slot-duration"
                                type="number"
                                placeholder="Slot Duration (minutes)"
                                value={slotDuration || ''}
                                onChange={(e) => setSlotDuration(e.target.value)}
                            />
                        </div>
                        <div className="create-event__input-field">
                            <label htmlFor="setup-duration">Setup Duration (minutes)</label>
                            <TextInput
                                id="setup-duration"
                                type="number"
                                placeholder="Setup Duration (minutes)"
                                value={setupDuration || ''}
                                onChange={(e) => setSetupDuration(e.target.value)}
                            />
                        </div>
                        <div className="create-event__input-field">
                            <label htmlFor="additional-information">Event Description</label>
                            <textarea
                                id="additional-information"
                                className="input-style"
                                placeholder="Event Description"
                                value={additionalInfo}
                                onChange={(e) => setAdditionalInfo(e.target.value)}
                            />
                        </div>
                        <div className="create-event__input-field">
                            <label htmlFor="event-image">Event Image</label>
                            <input
                                type="file"
                                id="event-image"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="create-event__file-input"
                                style={{ display: 'block' }}
                            />
                            {imagePreview && (
                                <img
                                    src={imagePreview}
                                    alt="Event preview"
                                    className="create-event__image-preview"
                                />
                            )}
                        </div>
                        <div className="create-event__input-field">
                            <label>Event Type(s)</label>
                            <div className="create-event__checkboxes">
                                {EVENT_TYPE_OPTIONS.map(option => (
                                    <div key={option.value} className="create-event__checkbox-group">
                                        <label className="create-event__checkbox-label">
                                            <input
                                                type="checkbox"
                                                className="create-event__checkbox"
                                                checked={eventTypes.includes(option.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setEventTypes([...eventTypes, option.value]);
                                                    } else {
                                                        setEventTypes(eventTypes.filter(type => type !== option.value));
                                                    }
                                                }}
                                            />
                                            {option.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </BorderBox>
            </div>
            <div className="create-event__container">
                <BorderBox>
                    <h2 className="create-event__title">Location</h2>
                    <div className="create-event__form-content">
                        <VenueAutocomplete
                            onPlaceSelected={(place) => {
                                setSelectedVenue(place);
                            }}
                            resetTrigger={resetTrigger}
                            onResetComplete={handleResetComplete}
                            initialValue={selectedVenue ? `${selectedVenue.name}, ${selectedVenue.address}` : ''}
                            specificCoordinates={true}
                            placeholder="Choose a location"
                            key={selectedVenue ? `${selectedVenue.name}-${selectedVenue.address}` : 'empty'}
                        />
                        <div className="create-event__map-container">
                            <LocationMap
                                latitude={selectedVenue?.latitude}
                                longitude={selectedVenue?.longitude}
                                showMarker={true}
                            />
                        </div>
                    </div>
                </BorderBox>
            </div>
            <div className="create-event__button-row">
                {isEditMode && (
                    <button 
                        className={`create-event__status-button ${
                            isEventActive ? 'create-event__status-button--cancel' : 'create-event__status-button--reinstate'
                        } ${pendingStatusChange ? 'create-event__status-button--pending' : ''}`}
                        onClick={handleEventStatusToggle}
                    >
                        {isEventActive ? 'Cancel Event' : 'Reinstate Event'}
                    </button>
                )}
                <button 
                    className="create-event__button"
                    onClick={handleSubmit}
                >
                    {isEditMode ? 'Save' : 'Submit'}
                </button>
                {isEditMode && (
                    <button 
                        className="create-event__button"
                        onClick={() => navigate(-1)}
                    >
                        Cancel
                    </button>
                )}
            </div>
            {showStatusModal && (
                <div className="create-event__modal">
                    <div className="create-event__modal-content" data-testid="status-modal">
                        <h4>
                            {isEventActive
                                ? 'Are you sure you want to cancel this event?'
                                : 'Are you sure you want to reinstate this event?'}
                        </h4>
                        <p>
                            {isEventActive 
                                ? 'This will notify all participants that the event has been cancelled.' 
                                : 'This will notify all participants that the event has been reinstated.'}
                        </p>
                        <div className="create-event__modal-buttons">
                            <button 
                                className="create-event__modal-button create-event__modal-button--confirm"
                                onClick={handleConfirmStatusChange}
                            >
                                Confirm
                            </button>
                            <button 
                                className="create-event__modal-button create-event__modal-button--cancel"
                                onClick={() => {
                                    setShowStatusModal(false);
                                    setPendingStatusChange(false);
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CreateEvent;
