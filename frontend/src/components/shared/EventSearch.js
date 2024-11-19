import React, { useState } from 'react';
import './EventSearch.sass';

const EventSearch = ({
    onSearch,
    placeholder = "Filter events by name, venue, or host",
    onClear
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        onSearch(value);
    };

    const handleClear = () => {
        setSearchTerm('');
        onSearch('');
        if (onClear) {
            onClear();
        }
    };

    return (
        <div className="event-search">
            <div className="event-search__input-wrapper">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleChange}
                    className="event-search__input"
                />
                {searchTerm && (
                    <button 
                        className="event-search__clear-button"
                        onClick={handleClear}
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

export default EventSearch;
