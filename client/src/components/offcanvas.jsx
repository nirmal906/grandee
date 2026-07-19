import React, { useEffect } from 'react';
import { X } from 'lucide-react';
function Drawer({ isOpen, onClose, title, children, position = 'right', size = 'md' }){

    // Close drawer on escape key
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
    },[isOpen, onClose]);
    if(!isOpen) return null;

    // Position classes
    const positionClasses = {
        right: 'right-0 top-0 h-full',
        left: 'left-0 top-0 h-full',
        top: 'top-0 left-0 w-full',
        bottom: 'bottom-0 left-0 w-full'
    };

    // Size classes
    const sizeClasses = {
        sm: position   === 'right' || position === 'left' ? 'w-64' : 'h-64',
        md: position   === 'right' || position === 'left' ? 'w-80' : 'h-80',
        lg: position   === 'right' || position === 'left' ? 'w-96' : 'h-96',
        xl: position   === 'right' || position === 'left' ? 'w-1/3' : 'h-1/3',
        full: position === 'right' || position === 'left' ? 'w-full max-w-md' : 'h-3/4'
    };

    // Animation classes
    const animationClasses = {
        right : 'animate-slide-in-right',
        left  : 'animate-slide-in-left',
        top   : 'animate-slide-in-top',
        bottom: 'animate-slide-in-bottom'
    };

    return(
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">  
            {/* Drawer backdrop - clicking it closes the drawer */}
            <div 
                className="absolute inset-0" 
                onClick={onClose}
                aria-hidden="true"
            />
                {/* Drawer content */}
                <div 
                    className = {`${positionClasses[position]} ${sizeClasses[size]} ${animationClasses[position]} fixed bg-white shadow-lg overflow-hidden flex flex-col`}
                    onClick   = {(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-gray-200 border-b">
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <button
                            type       = "button"
                            onClick    = {onClose}
                            className  = "text-gray-400 hover:text-gray-500 focus:outline-none rounded-full p-1 hover:bg-gray-100"
                            aria-label = "Close drawer"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    {/* Body */}
                    <div className="p-4 overflow-y-auto flex-grow">
                        {children}
                    </div>
                </div>
            </div>
    );
}
export default Drawer;