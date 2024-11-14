// src/components/events/CreateEvent.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import VenueAutocomplete from '../shared/VenueAutocomplete';
import TextInput from '../shared/TextInput';
import LocationMap from '../shared/LocationMap';
// import { ReactComponent as EditIcon } from "../../assets/icons/edit.svg";
import './CreateEvent.sass';
import BorderBox from '../shared/BorderBox/BorderBox';

function CreateEvent() {
    const { eventId } = useParams();
    const [eventData, setEventData] = useState(null);
    const [newEventName, setNewEventName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [slotDuration, setSlotDuration] = useState('0'); // Initialize with '0' to avoid NaN
    const [setupDuration, setSetupDuration] = useState('5'); // Initialize with '5' to avoid NaN
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [resetTrigger, setResetTrigger] = useState(false);
    const { getUserId } = useAuth();
    const navigate = useNavigate();
    const isEditMode = !!eventId;
    const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
    const [isEditingLocation, setIsEditingLocation] = useState(false);

    useEffect(() => {
        if (eventId) {
            const fetchEventDetails = async () => {
                try {
                    const response = await fetch(`/api/events/${eventId}`);
                    const data = await response.json();
                    setEventData(data);
                    setNewEventName(data.event?.name || '');
                    setStartTime(data.event?.start_time ? new Date(data.event.start_time).toISOString().slice(0, 16) : '');
                    setEndTime(data.event?.end_time ? new Date(data.event.end_time).toISOString().slice(0, 16) : '');
                    setSlotDuration(data.event?.slot_duration?.minutes ? data.event.slot_duration.minutes.toString() : '0');
                    setSetupDuration(data.event?.setup_duration?.minutes ? data.event.setup_duration.minutes.toString() : '5'); // Default to 5 if not set
                    if (data.venue && isGoogleMapsLoaded) {
                        setSelectedVenue({
                            name: data.venue?.name || '',
                            address: data.venue?.address || '',
                            latitude: data.venue?.latitude || 0,
                            longitude: data.venue?.longitude || 0
                        });
                    }
                    setAdditionalInfo(data.event?.additional_info || '');
                } catch (error) {
                    console.error('Error fetching event details:', error);
                }
            };

            fetchEventDetails();
        }
    }, [eventId, isGoogleMapsLoaded]);

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

    const handleSubmit = async () => {
        console.log("handleSubmit triggered");
        console.log("Selected venue:", selectedVenue); // Log to ensure venue is set
        console.log("Event name:", newEventName); // Log event name
        console.log("Start time:", startTime); // Log start time
        console.log("End time:", endTime); // Log end time

        if (!selectedVenue) {
            alert("Please select a location from the dropdown.");
            return;
        }
        if (new Date(startTime) >= new Date(endTime)) {
            alert("Start time must be before end time.");
            return;
        }

        let venueId = await checkOrCreateVenue(selectedVenue);

        const hostId = getUserId();
        try {
            const response = await fetch(isEditMode ? `/api/events/${eventId}` : '/api/events', {
                method: isEditMode ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newEventName,
                    venue_id: venueId,
                    start_time: startTime,
                    end_time: endTime,
                    slot_duration: slotDuration * 60, // Convert minutes to seconds
                    setup_duration: setupDuration * 60, // Convert minutes to seconds
                    additional_info: additionalInfo,
                    host_id: hostId,
                }),
            });
            const newEvent = await response.json();
            navigate(`/events/${newEvent.id}`); // Navigate to the new event's page
        } catch (error) {
            console.error('Error creating event:', error);
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
                                onChange={(e) => setStartTime(e.target.value)}
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
                            <label htmlFor="additional-information">Additional Information</label>
                            <textarea
                                id="additional-information"
                                className="input-style"
                                placeholder="Additional Info"
                                value={additionalInfo}
                                onChange={(e) => setAdditionalInfo(e.target.value)}
                            />
                        </div>
                    </div>
                </BorderBox>
            </div>
            <div className="create-event__container">
                <BorderBox
                    maxWidth="600px"
                    onEdit={isEditMode ? () => setIsEditingLocation(true) : null}
                >
                    <h2 className="create-event__title">Location</h2>
                    <div className="create-event__form-content">
                        {(!isEditMode || isEditingLocation) ? (
                            <VenueAutocomplete
                                onPlaceSelected={(place) => {
                                    setSelectedVenue(place);
                                    setIsEditingLocation(false);
                                }}
                                resetTrigger={resetTrigger}
                                onResetComplete={handleResetComplete}
                                initialValue={selectedVenue ? `${selectedVenue.name}, ${selectedVenue.address}` : ''}
                                specificCoordinates={true}
                                placeholder="Search for a venue"
                            />
                        ) : (
                            <p className="create-event__text">
                                {selectedVenue?.name}, {selectedVenue?.address}
                            </p>
                        )}
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
            <button className="submit-button" onClick={handleSubmit}>{isEditMode ? 'Save' : 'Submit'}</button>
            {isEditMode && <button className="cancel-button" onClick={() => navigate(-1)}>Cancel</button>}
        </div>
    );
}

export default CreateEvent;
