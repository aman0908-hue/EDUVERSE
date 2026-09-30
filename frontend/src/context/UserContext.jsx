import { createContext, useState, useEffect } from 'react';
import api from '../utils/api.js';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    // 1. Page load hone par check karna ki kya user pehle se login tha
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    // 🚀 /auth/me session-restore complete hua ya nahi (route guards ke liye)
    const [sessionChecked, setSessionChecked] = useState(false);

    // 2. Jab bhi user change ho (login/logout), use localStorage mein save/remove karna
    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    // 🚀 3. REQUIREMENT: Persistent session via GET /auth/me on page reload
    useEffect(() => {
        const restoreSession = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            // Agar token aur user dono nahi hain, toh verification ki zaroorat nahi
            if (!token && !storedUser) {
                setUser(null);
                setSessionChecked(true);
                return;
            }

            try {
                const res = await api.get('/auth/me');
                if (res.data?.user) {
                    setUser(res.data.user);
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                }
            } catch (error) {
                // 401 = cookie/token expired ya invalid. Stale session hatao
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            } finally {
                setSessionChecked(true);
            }
        };
        restoreSession();
    }, []);

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, setUser, sessionChecked, logout }}>
            {children}
        </UserContext.Provider>
    );
};