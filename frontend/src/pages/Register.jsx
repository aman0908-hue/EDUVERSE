import { useState, useContext } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import Header from '../components/Header.jsx';
import { UserContext } from '../context/UserContext.jsx';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'student' 
    });
    // 🚀 NAYA: Profile image upload support (Requirement 3.1)
    const [profileImage, setProfileImage] = useState(null);
    
    const navigate = useNavigate();
    const { user, sessionChecked } = useContext(UserContext);

    // 🚀 Agar pehle se logged-in hai toh register page ki jagah dashboard dikhao
    if (sessionChecked && user) {
        return <Navigate to={user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'} replace />;
    }

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setProfileImage(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // FormData mein saari fields + profile image bhejni hai
            const dataToSend = new FormData();
            Object.keys(formData).forEach(key => dataToSend.append(key, formData[key]));
            if (profileImage) dataToSend.append('profileImage', profileImage);

            const response = await api.post('/auth/register', dataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(response.data.message || 'Registration successful!'); 
            navigate('/login'); 
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-color)' }}>
            <Header />
            <div className="page-wrapper" style={{ flex: 1 }}>
            <div className="auth-card">
                
                <h2 className="main-title">Create Account</h2>
                <p className="subtitle">Join EduVerse to start learning today</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input type="text" name="name" placeholder="John Doe" required onChange={handleChange} className="form-input" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input type="email" name="email" placeholder="you@example.com" required onChange={handleChange} className="form-input" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" name="password" placeholder="•••••••• (min 6 characters)" minLength={6} required onChange={handleChange} className="form-input" />
                    </div>

                    <div className="form-group">
                        <label className="form-label">I am a...</label>
                        <select name="role" onChange={handleChange} className="form-input">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </div>

                    {/* 🚀 NAYA: Profile image picker */}
                    <div className="form-group">
                        <label className="form-label">Profile Image (optional)</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="form-input" />
                    </div>

                    <button type="submit" className="btn btn-primary">
                        Register Now
                    </button>
                </form>

                <p className="bottom-link-text">
                    Already have an account? <Link to="/login" className="text-link">Log in</Link>
                </p>
                </div>
            </div>
        </div>
    );
};

export default Register;