import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { useTheme } from "../context/themeContext"

const InfoTooltip = ({ text, position = "top" }) => {
  const { theme } = useTheme(); 
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const closeTimeout = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(closeTimeout.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 150);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Tooltip positions
  const tooltipPosition = {
    top: "bottom-7 left-1/2 -translate-x-1/2",
    bottom: "top-7 left-1/2 -translate-x-1/2",
    left: "right-7 top-1/2 -translate-y-1/2",
    right: "left-7 top-1/2 -translate-y-1/2",
  };

  // Arrow positions
  const arrowPosition = {
    top: "left-1/2 -translate-x-1/2 top-full border-t-gray-800",
    bottom: "left-1/2 -translate-x-1/2 bottom-full border-b-gray-800",
    left: "top-1/2 -translate-y-1/2 left-full border-l-gray-800",
    right: "top-1/2 -translate-y-1/2 right-full border-r-gray-800",
  };

  // Arrow base classes
  const arrowBase =
    "absolute w-0 h-0 border-8 border-transparent";

  return (
    <div ref={containerRef} className="relative inline-block float-right">
      {/* Icon */}
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer inline-flex"
      >
        <Info size={16} style={{ color: theme.primaryColor }} />
      </span>

      {/* Tooltip box */}
      {open && (
        <div
          className={`absolute bg-gray-800 text-white text-xs rounded-lg px-3 py-2 
                      w-32 shadow-lg z-60 pointer-events-none
                      ${tooltipPosition[position]}`}
        >
          {text}
          {/* Arrow */}
          <span className={`${arrowBase} ${arrowPosition[position]}`}></span>
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
