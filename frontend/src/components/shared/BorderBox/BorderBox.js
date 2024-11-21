import React from 'react';
import { ReactComponent as EditIcon } from "../../../assets/icons/edit.svg";
import { ReactComponent as DeleteIcon } from "../../../assets/icons/delete.svg";
import './BorderBox.sass';

const BorderBox = ({
                       children,
                       onEdit,
                       onDelete,
                       className = '',
                       maxWidth
                   }) => {
    const style = maxWidth ? { maxWidth } : {};

    return (
        <div className={`border-box ${className}`} style={style}>
            {(onEdit || onDelete) && (
                <div className="border-box__icons">
                    {onEdit && (
                        <button
                            className="border-box__icon-button"
                            onClick={onEdit}
                            aria-label="Edit"
                        >
                            <EditIcon className="border-box__icon"/>
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className="border-box__icon-button"
                            onClick={onDelete}
                            aria-label="Delete"
                        >
                            <DeleteIcon className="border-box__icon"/>
                        </button>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};

export default BorderBox;
