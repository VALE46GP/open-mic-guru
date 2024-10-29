import React from 'react';

const TextInput = ({ id, placeholder, type = 'text', value, onChange }) => {
    return (
        <input
            id={id}
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
        />
    );
};

export default TextInput;
