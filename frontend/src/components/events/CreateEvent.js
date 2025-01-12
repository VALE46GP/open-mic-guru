import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { convertToUTC, convertFromUTC } from '../../utils/timeCalculations';
import { useNavigate, useParams } from 'react-router-dom';
import VenueAutocomplete from '../shared/VenueAutocomplete';
import TextInput from '../shared/TextInput';
import LocationMap from '../shared/LocationMap';
import './CreateEvent.sass';
import BorderBox from '../shared/BorderBox/BorderBox';

function CreateEvent() {
    const { eventId } = useParams();
    const [newEventName, setNewEventName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [slotDuration, setSlotDuration] = useState('10');
    const [setupDuration, setSetupDuration] = useState('5');
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [resetTrigger, setResetTrigger] = useState(false);
    const { getUserId, authenticatedFetch } = useAuth();
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
                        setNewEventName(data.event.name || '');
                        setAdditionalInfo(data.event.additional_info || '');
                        setEventTypes(data.event.event_types || []);
                        setIsEventActive(data.event.active ?? true);

                        if (data.event.image) {
                            setImagePreview(data.event.image);
                        }

                        // Convert UTC times using the venue's UTC offset
                        if (data.event.start_time && data.venue?.utc_offset) {
                            const localStart = convertFromUTC(data.event.start_time, data.venue.utc_offset);
                            setStartTime(localStart.slice(0, -6));
                        }

                        if (data.event.end_time && data.venue?.utc_offset) {
                            const localEnd = convertFromUTC(data.event.end_time, data.venue.utc_offset);
                            setEndTime(localEnd.slice(0, -6));
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
                                utc_offset: data.venue.utc_offset,
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
            setIsGoogleMapsLoaded(true);
        }
    }, [isGoogleMapsLoaded]);

    const handleVenueSelect = async (place) => {
        if (!place || !place.geometry) return;

        const latitude = place.geometry.location.lat();
        const longitude = place.geometry.location.lng();
        const formattedAddress = place.address_components?.map(ac => ac.short_name).join(', ') || place.address;

        try {
            const processedVenue = {
                ...place,
                name: place.name || '',
                address: formattedAddress,
                latitude,
                longitude,
                // Use utc_offset_minutes if available, otherwise default to -420 (PDT)
                utc_offset: place.utc_offset_minutes !== undefined ? place.utc_offset_minutes : -420,
                geometry: {
                    location: {
                        lat: () => latitude,
                        lng: () => longitude
                    }
                }
            };

            setSelectedVenue(processedVenue);
            
        } catch (error) {
            console.error('Error in handleVenueSelect:', error);
            alert('Error processing venue information. Please try again.');
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Only set the preview URL in imagePreview
            setImagePreview(URL.createObjectURL(file));
            // Set the actual file in eventImage
            setEventImage(file);
            
            // Clean up the blob URL when component unmounts
            return () => URL.revokeObjectURL(imagePreview);
        }
    };

    const processImage = async (file) => {
        // If no file is provided or it's already an S3 URL, return as-is
        if (!file || (typeof file === 'string' && file.includes('amazonaws.com'))) {
            return file;
        }

        if (file instanceof File) {
            try {
                // Get the S3 upload URL
                const response = await fetch('/api/events/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileType: file.type
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to get upload URL');
                }

                const { uploadURL } = await response.json();

                // Upload to S3
                const uploadResponse = await fetch(uploadURL, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': file.type
                    },
                    body: file
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload image');
                }

                // Return the S3 URL (remove query parameters)
                return uploadURL.split('?')[0];
            } catch (error) {
                console.error('Error uploading image:', error);
                throw error;
            }
        }
        return null;  // Return null for invalid cases
    };

    const handleSubmit = async () => {
        if (!selectedVenue) {
            alert("Please select a location from the dropdown.");
            return;
        }
        if (typeof selectedVenue.utc_offset !== 'number') {
            alert("Venue UTC offset not available. Please try again.");
            return;
        }
        if (new Date(startTime) >= new Date(endTime)) {
            alert("Start time must be before end time.");
            return;
        }

        try {
            // Convert times to UTC using the venue's UTC offset
            const utcStartTime = convertToUTC(startTime, selectedVenue.utc_offset);
            const utcEndTime = convertToUTC(endTime, selectedVenue.utc_offset);

            let venueId = await checkOrCreateVenue({
                ...selectedVenue
            });

            // Process image before creating the payload
            let imageUrl;
            if (eventImage instanceof File) {
                try {
                    imageUrl = await processImage(eventImage);
                } catch (error) {
                    console.error('Error processing image:', error);
                    alert('Failed to upload image. Please try again.');
                    return;
                }
            } else if (isEditMode && !eventImage) {
                imageUrl = imagePreview;
            }

            const url = isEditMode ? `/api/events/${eventId}` : '/api/events';
            const method = isEditMode ? 'PATCH' : 'POST';

            const payload = {
                name: newEventName,
                venue_id: venueId,
                start_time: utcStartTime,
                end_time: utcEndTime,
                slot_duration: slotDuration * 60,
                setup_duration: setupDuration * 60,
                additional_info: additionalInfo,
                host_id: getUserId(),
                ...(imageUrl && { image: imageUrl }),
                types: eventTypes,
                active: pendingStatusChange ? !isEventActive : isEventActive
            };

            const response = await authenticatedFetch(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Failed to save event');
            }

            const data = await response.json();
            navigate(`/events/${data.id || eventId}`);
        } catch (error) {
            console.error('Error saving event:', error);
            alert('Failed to save event. Please try again.');
        }
    };

    const handleResetComplete = () => {
        setResetTrigger(false);
    };

    async function checkOrCreateVenue(selectedVenue) {
        const address = selectedVenue.address_components ?
            selectedVenue.address_components.map(component => component.short_name).join(', ') :
            selectedVenue.formatted_address || selectedVenue.address;

        const venueData = {
            name: selectedVenue.name,
            address: address,
            latitude: selectedVenue.geometry.location.lat(),
            longitude: selectedVenue.geometry.location.lng(),
            utc_offset: selectedVenue.utc_offset
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
        await handleSubmit();
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.\nAlternatively, you can cancel the event so that it is still visible and editable.')) {
            try {
                const response = await authenticatedFetch(`/api/events/${eventId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete event');
                }

                navigate('/events');
            } catch (error) {
                console.error('Error deleting event:', error);
                alert('Failed to delete event. Please try again.');
            }
        }
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
                            <label htmlFor="slot-duration">Performance Duration (minutes)</label>
                            <TextInput
                                id="slot-duration"
                                type="number"
                                placeholder="Performance Duration (minutes)"
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
                            onPlaceSelected={handleVenueSelect}
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
                {isEditMode && (
                    <button 
                        className="create-event__status-button create-event__status-button--delete"
                        onClick={handleDelete}
                    >
                        Delete Event
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
