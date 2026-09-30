import { createContext, useContext, useEffect, useState } from 'react';

// 🎨 Dark / Light theme — localStorage me save hota hai, reload par bhi yaad rehta hai.
const ThemeContext = createContext(null);

const STORAGE_KEY = 'at-theme';

const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';
    // 1) Pehle se user ne choose kiya hua theme
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // 2) Nahi to system preference follow karo
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);

    // HTML tag par attribute lagao — CSS [data-theme="dark"] isi par react karta hai
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme;
        window.localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
};

export default ThemeContext;
