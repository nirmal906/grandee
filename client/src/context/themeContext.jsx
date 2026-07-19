import React, { createContext, useContext, useState, useEffect } from 'react';

// For lighter shade
const getLightColor = (hexColor) => {
    if (!hexColor) return 'rgba(59, 130, 246, 0.15)';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
};

// Helper to create a CSS gradient string
const createGradient = (startColor, endColor, direction) => {
    return `linear-gradient(${direction}, ${startColor}, ${endColor})`;
};

const ThemeContext          = createContext();
export const ThemeProvider  = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        return{
            primaryGradientStart  : '#032677',
            primaryGradientEnd    : '#012e9a',
            secondaryGradientStart: '#032677',
            secondaryGradientEnd  : '#012e9a',
            sidebarGradientStart  : '#032677',
            sidebarGradientEnd    : '#012e9a',
            gradientDirection     : 'to right',
            primaryColor          : '#032677',
            secondaryColor        : '#012e9a',
            primaryColorLight     : getLightColor('#032677'),
            secondaryColorLight   : getLightColor('#012e9a'),
        };
    });

    // Update theme function - centralizes all theme-related updates
    const updateTheme = (newTheme) => {
        const updatedTheme = {
            ...theme,
            primaryGradientStart  : newTheme.primaryGradientStart || theme.primaryGradientStart,
            primaryGradientEnd    : newTheme.primaryGradientEnd || theme.primaryGradientEnd,
            secondaryGradientStart: newTheme.secondaryGradientStart || theme.secondaryGradientStart,
            secondaryGradientEnd  : newTheme.secondaryGradientEnd || theme.secondaryGradientEnd,
            sidebarGradientStart  : newTheme.sidebarGradientStart || theme.sidebarGradientStart,
            sidebarGradientEnd    : newTheme.sidebarGradientEnd || theme.sidebarGradientEnd,
            gradientDirection     : newTheme.gradientDirection || theme.gradientDirection,
        };
        
        // For backward compatibility
        updatedTheme.primaryColor        = updatedTheme.primaryGradientStart;
        updatedTheme.secondaryColor      = updatedTheme.secondaryGradientStart;
        updatedTheme.primaryColorLight   = getLightColor(updatedTheme.primaryGradientStart);
        updatedTheme.secondaryColorLight = getLightColor(updatedTheme.secondaryGradientStart);

        // Update state
        setTheme(updatedTheme);

        // Update localStorage
        Object.entries(updatedTheme).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });

        // Update CSS variables
        applyThemeToDOM(updatedTheme);
        
        // Dispatch a custom event to notify other components
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: updatedTheme }));
    };

    // Apply theme to DOM (separate function for reuse)
    const applyThemeToDOM = (themeObj) => {
        // Set original variables for backward compatibility
        document.documentElement.style.setProperty('--primary-color', themeObj.primaryGradientStart);
        document.documentElement.style.setProperty('--secondary-color', themeObj.secondaryGradientStart);
        document.documentElement.style.setProperty('--primary-color-light', themeObj.primaryColorLight);
        document.documentElement.style.setProperty('--secondary-color-light', themeObj.secondaryColorLight);
        
        // Set new gradient variables
        document.documentElement.style.setProperty('--primary-gradient-start', themeObj.primaryGradientStart);
        document.documentElement.style.setProperty('--primary-gradient-end', themeObj.primaryGradientEnd);
        document.documentElement.style.setProperty('--secondary-gradient-start', themeObj.secondaryGradientStart);
        document.documentElement.style.setProperty('--secondary-gradient-end', themeObj.secondaryGradientEnd);
        document.documentElement.style.setProperty('--sidebar-gradient-start', themeObj.sidebarGradientStart);
        document.documentElement.style.setProperty('--sidebar-gradient-end', themeObj.sidebarGradientEnd);
        document.documentElement.style.setProperty('--gradient-direction', themeObj.gradientDirection);
        
        // Set complete gradient CSS strings
        document.documentElement.style.setProperty(
            '--primary-gradient', 
            createGradient(themeObj.primaryGradientStart, themeObj.primaryGradientEnd, themeObj.gradientDirection)
        );
        document.documentElement.style.setProperty(
            '--secondary-gradient', 
            createGradient(themeObj.secondaryGradientStart, themeObj.secondaryGradientEnd, themeObj.gradientDirection)
        );
        document.documentElement.style.setProperty(
            '--sidebar-gradient', 
            createGradient(themeObj.sidebarGradientStart, themeObj.sidebarGradientEnd, themeObj.gradientDirection)
        );
    };

    // Listen for storage changes (for cross-tab sync)
    useEffect(() => {
        const handleStorageChange = (event) => {
            if(event.key && event.key.includes('Gradient')) {
                const updatedTheme = {
                    primaryGradientStart  : localStorage.getItem('primaryGradientStart') || theme.primaryGradientStart,
                    primaryGradientEnd    : localStorage.getItem('primaryGradientEnd') || theme.primaryGradientEnd,
                    secondaryGradientStart: localStorage.getItem('secondaryGradientStart') || theme.secondaryGradientStart,
                    secondaryGradientEnd  : localStorage.getItem('secondaryGradientEnd') || theme.secondaryGradientEnd,
                    sidebarGradientStart  : localStorage.getItem('sidebarGradientStart') || theme.sidebarGradientStart,
                    sidebarGradientEnd    : localStorage.getItem('sidebarGradientEnd') || theme.sidebarGradientEnd,
                    gradientDirection     : localStorage.getItem('gradientDirection') || theme.gradientDirection,
                };
                updateTheme(updatedTheme);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [theme]);

    // Apply theme to DOM on initial render
    useEffect(() => {
        applyThemeToDOM(theme);
    }, []);
    return(
        <ThemeContext.Provider value={{ theme, updateTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if(!context){
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
export default ThemeContext;