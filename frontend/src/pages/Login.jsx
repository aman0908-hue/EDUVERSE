import { useState, useContext } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Header from '../components/Header.jsx';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const { setUser, user, sessionChecked } = useContext(UserContext);
    const navigate = useNavigate();

    // 🚀 Agar session pehle se active hai (7-day cookie) toh login page ki jagah dashboard dikhao
    if (sessionChecked && user) {
        return <Navigate to={user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'} replace />;
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/auth/login', formData);
            if (response.data.success || response.data.message === "Login successful!") {
                setUser(response.data.user);
                toast.success("Login successful!");
                
                // Role ke hisaab se redirect karna
                if (response.data.user.role === 'teacher') {
                    navigate('/teacher-dashboard');
                } else {
                    navigate('/student-dashboard');
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
            <Header />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div className="dashboard-card" style={{ width: '100%', maxWidth: '400px', padding: '30px' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>EduVerse</h2>
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '20px' }}>Please login to your account</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '5px' }}>Email Address</label>
                        <input 
                            type="email" 
                            name="email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            className="form-control" 
                            style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                            placeholder="Enter your email"
                            required 
                        />
                    </div>
                    
                    <div className="form-group" style={{ marginTop: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>Password</label>
                        <input 
                            type="password" 
                            name="password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            className="form-control"
                            style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                            placeholder="Enter your password"
                            required 
                        />
                    </div>
                    
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px', padding: '10px' }} disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                
                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
                    Don't have an account? <Link to="/register" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: '600' }}>Register here</Link>
                </p>
                </div>
            </div>
        </div>
    );
};

export default Login;