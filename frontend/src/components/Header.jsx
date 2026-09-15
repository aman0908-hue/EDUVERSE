import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import toast from 'react-hot-toast';
import { UserContext } from '../context/UserContext.jsx';
import api from '../utils/api.js';

// 🚀 Reusable Header/Navbar component (Requirement: components/Header)
const Header = ({ subtitle }) => {
    const { user, setUser } = useContext(UserContext);
    const navigate = useNavigate();

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
            <Link to="/" className="nav-logo">
                EduVerse {subtitle && <span style={{ color: '#6b7280', fontSize: '1rem', fontWeight: '600' }}>| {subtitle}</span>}
            </Link>

            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <Link to="/courses" className="text-link" style={{ color: '#374151', fontWeight: 500 }}>Courses</Link>
                {user && (
                    <Link
                        to={user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'}
                        className="text-link"
                        style={{ color: '#374151', fontWeight: 500 }}
                    >
                        Dashboard
                    </Link>
                )}
            </div>

            <div className="nav-profile">
                {user ? (
                    <>
                        <span style={{ fontWeight: '600' }}>{user.name}</span>
                        <div className="avatar" style={{ background: user.role === 'teacher' ? 'linear-gradient(135deg, #166534, #4ade80)' : 'linear-gradient(135deg, #4f46e5, #818cf8)' }}>
                            {user.profileImage ? (
                                <img
                                    src={`${import.meta.env.VITE_API_URL}/uploads/${user.profileImage}`}
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