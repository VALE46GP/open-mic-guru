import React from 'react';
import './Switch.sass';

const Switch = ({ checked, onChange, disabled }) => (
    <div className={`switch ${disabled ? 'switch--disabled' : ''}`}>
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="switch__input"
        />
        <span className="switch__slider" />
    </div>
);

export default Switch; 