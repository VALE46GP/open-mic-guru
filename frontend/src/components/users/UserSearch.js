import React, { useState } from 'react';
import './UserSearch.sass';

const UserSearch = ({ onSearch, placeholder = "Search users by name", onClear }) => {
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
        <div className="user-search">
            <div className="user-search__input-wrapper">
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={handleChange}
                    className="user-search__input"
                />
                {searchTerm && (
                    <button
                        className="user-search__clear-button"
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

export default UserSearch;
