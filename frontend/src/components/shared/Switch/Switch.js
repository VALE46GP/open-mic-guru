import React from 'react';
import './Switch.sass';

const Switch = ({ checked = false, onChange, disabled }) => (
    <div className={`switch ${disabled ? 'switch--disabled' : ''}`}>
        <input
            type="checkbox"
            checked={Boolean(checked)}
            onChange={onChange}
            disabled={disabled}
            className="switch__input"
        />
        <span className="switch__slider" />
    </div>
);

export default Switch; 