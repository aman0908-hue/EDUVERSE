import { Link, useNavigate } from 'react-router-dom';
import { useState, useContext } from 'react';
import { Menu, X, Sparkles, ShieldCheck, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserContext } from '../context/UserContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api, { assetUrl } from '../utils/api.js';

// 🚀 Reusable Header/Navbar component (Requirement: components/Header)
const Header = ({ subtitle }) => {
    const { user, setUser } = useContext(UserContext);
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const closeMenu = () => setMenuOpen(false);

    const getInitial = () => (user?.name ? user.name.charAt(0).toUpperCase() : '?');

    // Logout: backend cookie clear + context clear
    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // Logout API fail ho toh bhi local logout karo
        }
        setUser(null);
        toast.success('Logged out successfully');
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <Link to="/" className="nav-logo" onClick={closeMenu}>
                ATs Learning {subtitle && <span style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '600' }}>| {subtitle}</span>}
            </Link>

            <button
                className="nav-menu-toggle"
                type="button"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(open => !open)}
            >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div className={`nav-links${menuOpen ? ' nav-links-open' : ''}`} onClick={closeMenu}>
                {/* 🎨 Dark / Light toggle */}
                <button
                    type="button"
                    className="theme-toggle"
                    onClick={toggleTheme}
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <Link to="/courses" className="text-link" style={{ color: '#374151', fontWeight: 500 }}>Courses</Link>
                {user && (
                    <>
                        <Link to="/ai-assistant" className="nav-ai-link">
                            <Sparkles size={15} /> AI Assistant
                        </Link>
                        <Link
                            to={user.role === 'admin' ? '/admin-dashboard' : user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'}
                            className={user.role === 'admin' ? 'nav-admin-link' : 'text-link'}
                            style={user.role === 'admin' ? undefined : { color: '#374151', fontWeight: 500 }}
                        >
                            {user.role === 'admin' ? <><ShieldCheck size={15} /> Admin Panel</> : 'Dashboard'}
                        </Link>
                    </>
                )}
            </div>

            <div className="nav-profile" onClick={closeMenu}>
                {user ? (
                    <>
                        <span style={{ fontWeight: '600' }}>{user.name}</span>
                        <div className="avatar" style={{ background: user.role === 'admin' ? 'linear-gradient(135deg, #991b1b, #f87171)' : user.role === 'teacher' ? 'linear-gradient(135deg, #166534, #4ade80)' : 'linear-gradient(135deg, #4f46e5, #818cf8)' }}>
                            {user.profileImage ? (
                                <img
                                    src={assetUrl(user.profileImage)}
                                    alt="profile"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                />
                            ) : (
                                getInitial()
                            )}
                        </div>
                        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '8px 15px', fontSize: '0.85rem' }}>Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="btn btn-outline" style={{ padding: '8px 18px', fontSize: '0.9rem', textDecoration: 'none' }}>Login</Link>
                        <Link to="/register" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.9rem', textDecoration: 'none' }}>Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Header;