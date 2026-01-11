import React from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
    if (!isOpen) return null;

    const sizeClass = size === 'large' ? 'large' : '';

    return (
        <div className="modal" onClick={onClose}>
            <div
                className={`modal-content ${sizeClass}`}
                onClick={e => e.stopPropagation()}
            >
                {title && <h3>{title}</h3>}
                {children}
            </div>
        </div>
    );
};

export default Modal;
