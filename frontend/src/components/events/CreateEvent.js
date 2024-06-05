import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import VenueAutocomplete from '../shared/VenueAutocomplete';
import TextInput from '../shared/TextInput';
import LocationMap from '../shared/LocationMap';
import './CreateEvent.sass';

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
            // Fetch event details and set form fields
            const fetchEventDetails = async () => {
                try {
                    const response = await fetch(`/api/events/${eventId}`);
                    const data = await response.json();
                    console.log('>>>>>>>>>>>>>>>>>>>>>>> data = ', data)
                    setEventData(data);
                    setNewEventName(data.event?.name || '');
                    setStartTime(data.event?.start_time ? new Date(data.event.start_time).toISOString().slice(0, 16) : '');
                    setEndTime(data.event?.end_time ? new Date(data.event.end_time).toISOString().slice(0, 16) : '');
                    setSlotDuration(data.event?.slot_duration?.minutes ? data.event.slot_duration.minutes.toString() : '0');
                    setSetupDuration(data.event?.setup_duration?.minutes ? data.event.setup_duration.minutes.toString() : '5'); // Default to 5 if not set
                    console.log('Venue data before setting state:', data.venue);
                    if (data.venue && isGoogleMapsLoaded) {
                        setSelectedVenue({
                            name: data.venue?.name || '',
                            address: data.venue?.address || '',
                            latitude: data.venue?.latitude || 0,
                            longitude: data.venue?.longitude || 0
                        });
                    } else {
                        console.log('No venue data available or Google Maps not loaded');
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
        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps && !isGoogleMapsLoaded) {
                console.log("Google Maps API is fully loaded");
                clearInterval(checkGoogleMapsLoaded);
                setIsGoogleMapsLoaded(true);
            }
        }, 100); // Check every 100 milliseconds

        return () => clearInterval(checkGoogleMapsLoaded); // Cleanup on unmount
    }, [isGoogleMapsLoaded]);

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
        console.log('Sending event data:', { name: newEventName, venue_id: venueId, start_time: startTime, end_time: endTime, slot_duration: slotDuration * 60, setup_duration: setupDuration * 60, additional_info: additionalInfo, host_id: hostId });

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
        console.log('location: ', selectedVenue.location)
        console.log('latitude: ', selectedVenue.latitude)

        const address = selectedVenue.address_components ? selectedVenue.address_components.map(component => component.short_name).join(', ') : '';

        const venueData = {
            name: selectedVenue.name,
            address: address,
            latitude: selectedVenue.latitude,
            longitude: selectedVenue.longitude,
        };

        console.log('Sending venue data:', venueData);

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

    useEffect(() => {
        console.log('Updated SelectedVenue state:', selectedVenue);
    }, [selectedVenue]);

    console.log('SelectedVenue before passing to VenueAutocomplete:', selectedVenue);

    return (
        <div className="create-event">
            <h1>{isEditMode ? 'Edit Your Event' : 'Create a New Event'}</h1>
            <label htmlFor="end-time">Event Name</label>
            <TextInput
                placeholder="Event Name"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
            />
            <label htmlFor="start-time">Start Time</label>
            <TextInput
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
            />
            <label htmlFor="end-time">End Time</label>
            <TextInput
                id="end-time"
                type="datetime-local"
                value={endTime || startTime} // Set to startTime if endTime is not set
                onChange={(e) => setEndTime(e.target.value)}
            />
            <label htmlFor="end-time">Slot Duration (minutes)</label>
            <TextInput
                type="number"
                placeholder="Slot Duration (minutes)"
                value={slotDuration || ''}
                onChange={(e) => setSlotDuration(e.target.value)}
            />
            <label htmlFor="end-time">Setup Duration (minutes)</label>
            <TextInput
                type="number"
                placeholder="Setup Duration (minutes)"
                value={setupDuration || ''}
                onChange={(e) => setSetupDuration(e.target.value)}
            />
            <label htmlFor="end-time">Additional Information</label>
            <textarea
                className="input-style"
                placeholder="Additional Info"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
            />
            <div className="create-event__map-container">
                <LocationMap
                        latitude={selectedVenue?.latitude}
                        longitude={selectedVenue?.longitude}
                        showMarker={true}
                />
            </div>
            {isEditMode && !isEditingLocation && (
                <>
                    <p className="create-event__text">Location: {selectedVenue?.name}, {selectedVenue?.address}</p>
                    <button onClick={() => setIsEditingLocation(true)}>Edit Location</button>
                </>
            )}
            {(!isEditMode || isEditingLocation) && (
                <>
                    <VenueAutocomplete
                        onPlaceSelected={(place) => {
                            setSelectedVenue(place);
                            setIsEditingLocation(false);
                        }}
                        resetTrigger={resetTrigger}
                        onResetComplete={() => handleResetComplete()}
                        initialValue={selectedVenue ? `${selectedVenue.name}, ${selectedVenue.address}` : ''}
                    />
                </>
            )}
            <button className="submit-button" onClick={handleSubmit}>{isEditMode ? 'Save' : 'Submit'}</button>
            {isEditMode && <button className="cancel-button" onClick={() => navigate(-1)}>Cancel</button>}
        </div>
    );
}

export default CreateEvent;
