import React, { useEffect } from 'react';
import { X } from 'lucide-react';
function Modal({ isOpen, onClose, title, children, size = 'md' }){

    // Close modal on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if(e.key === 'Escape') onClose(); 
        };
        if(isOpen){
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden'; 
        }
        return() => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);
    if(!isOpen) return null;

    // Size classes
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-full'
    };

    return(
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }} className="fixed inset-0 z-60 flex items-center justify-center p-4">  
            {/* Modal backdrop - clicking it closes the modal */}
            <div 
                className   = "absolute inset-0" 
                onClick     = {onClose}
                aria-hidden = "true"
            />
                {/* Modal content */}
                <div 
                    className = {`relative bg-white rounded-lg shadow-lg w-full ${sizeClasses[size]} mx-auto overflow-hidden`}
                    onClick   = {(e) => e.stopPropagation()}
                >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-gray-200 border-b">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <button
                        type       = "button"
                        onClick    = {onClose}
                        className  = "text-gray-400 hover:text-gray-500 focus:outline-none rounded-full p-1 hover:bg-gray-100"
                        aria-label = "Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>
                {/* Body */}
                <div className="p-4 max-h-[80vh] overflow-y-auto bg-white">
                    {children}
                </div>
            </div>
        </div>
    );
}
export default Modal;
