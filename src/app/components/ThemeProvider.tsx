'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
    isDark: false,
    toggleTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    // Default to false (Light Mode)
    const [isDark, setIsDark] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Force light mode
        setIsDark(false);
        document.documentElement.classList.remove('dark-theme');
        localStorage.setItem('yemekya_theme', 'light');
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        // Effectively disabled
    };

    // Avoid hydration mismatch by not rendering anything until mounted
    // Or just render with the default (light) and let useEffect sync
    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            <div className={mounted ? '' : 'light-mode-forced'}>
                {children}
            </div>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
