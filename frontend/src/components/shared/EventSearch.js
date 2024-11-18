import React, { useState } from 'react';
import './EventSearch.sass';

const EventSearch = ({
    onSearch,
    placeholder = "Filter events by name, venue, or host"
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        onSearch(value);
    };

    return (
        <div className="event-search">
            <input
                type="text"
                placeholder={placeholder}
                value={searchTerm}
                onChange={handleChange}
                className="event-search__input"
            />
        </div>
    );
};

export default EventSearch;
