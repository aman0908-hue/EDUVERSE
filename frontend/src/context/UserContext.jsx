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
    // Cookie se server verify karega ki user sach mein logged in hai
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const res = await api.get('/auth/me');
                if (res.data?.user) {
                    setUser(res.data.user);
                }
            } catch (error) {
                // 401 = cookie expired/invalid. localStorage user ko hata do (stale session)
                if (error.response && error.response.status === 401) {
                    setUser(null);
                }
            } finally {
                setSessionChecked(true);
            }
        };
        restoreSession();
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, sessionChecked }}>
            {children}
        </UserContext.Provider>
    );
};