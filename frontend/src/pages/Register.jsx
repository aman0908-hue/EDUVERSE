import { useState, useContext } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import Header from '../components/Header.jsx';
import { UserContext } from '../context/UserContext.jsx';
import { GRADES } from '../components/timetableLogic.js';

const getRoleHome = user => user?.role === 'admin' ? '/admin-dashboard' : (user?.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard');

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', grade: '10'
    });
    const [applyForTeacher, setApplyForTeacher] = useState(false);
    const [teacherInfo, setTeacherInfo] = useState({ qualification: '', experience: '', subject: '', reason: '', teachesGrades: [] });
    // 🚀 NAYA: Profile image upload support (Requirement 3.1)
    const [profileImage, setProfileImage] = useState(null);
    
    const navigate = useNavigate();
    const { user, sessionChecked } = useContext(UserContext);

    // 🚀 Agar pehle se logged-in hai toh register page ki jagah dashboard dikhao
    if (sessionChecked && user) {
        return <Navigate to={getRoleHome(user)} replace />;
    }

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setProfileImage(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // FormData mein saari fields + profile image bhejni hai
            const dataToSend = new FormData();
            dataToSend.append('name', formData.name);
            dataToSend.append('email', formData.email);
            dataToSend.append('password', formData.password);
            dataToSend.append('applyForTeacher', String(applyForTeacher));
            if (applyForTeacher) {
                dataToSend.append('qualification', teacherInfo.qualification);
                dataToSend.append('experience', teacherInfo.experience);
                dataToSend.append('subject', teacherInfo.subject);
                dataToSend.append('reason', teacherInfo.reason);
                // 👨‍🏫 Teacher kis class ke liye padhaata hai
                dataToSend.append('teachesGrades', JSON.stringify(teacherInfo.teachesGrades));
            }
            if (profileImage) dataToSend.append('profileImage', profileImage);

            const response = await api.post('/auth/register', dataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data.requestCreated) {
                toast.success('Account created! Teacher request sent to admin.', { duration: 5000 });
            } else {
                toast.success(response.data.message || 'Registration successful!');
            }
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
                <p className="subtitle">Register as a student, or send a request to join as a teacher.</p>

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

                    {/* 🎓 Pehle role chuno — uske baad usi role ka field dikhega */}
                    <div className="form-group">
                        <label className="form-label">I want to join as</label>
                        <div className="role-choice">
                            <button type="button" className={!applyForTeacher ? 'active' : ''} onClick={() => setApplyForTeacher(false)}>Student</button>
                            <button type="button" className={applyForTeacher ? 'active' : ''} onClick={() => setApplyForTeacher(true)}>Teacher (approval needed)</button>
                        </div>
                        <small className="form-hint">
                            {applyForTeacher
                                ? 'You want to join as a teacher. Fill the details below — your teacher account is created only after an admin approves your request.'
                                : 'You want to join as a student. Choose your class below.'}
                        </small>
                    </div>

                    {/* 👨‍🎓 STUDENT — sirf class (grade) */}
                    {!applyForTeacher && (
                        <div className="form-group">
                            <label className="form-label">Currently studying in</label>
                            <select name="grade" value={formData.grade} onChange={handleChange} className="form-input" style={{ width: '100%' }}>
                                {GRADES.map(g => <option key={g} value={g}>Class {g}</option>)}
                            </select>
                            <small className="form-hint">
                                Which class are you studying in? You will only see courses for your own class, plus any course marked for all classes.
                            </small>
                        </div>
                    )}

                    {applyForTeacher && (
                        <div className="teacher-request-box">
                            {/* 👨‍🏫 TEACHER — kis class ke liye padhaega */}
                            <div className="form-group">
                                <label className="form-label">Which classes do you teach?</label>
                                <div className="grade-chips">
                                    {GRADES.map(g => {
                                        const on = teacherInfo.teachesGrades.includes(g);
                                        return (
                                            <button
                                                type="button"
                                                key={g}
                                                className={`grade-chip ${on ? 'active' : ''}`}
                                                onClick={() => setTeacherInfo({
                                                    ...teacherInfo,
                                                    teachesGrades: on
                                                        ? teacherInfo.teachesGrades.filter(x => x !== g)
                                                        : [...teacherInfo.teachesGrades, g]
                                                })}
                                            >
                                                {g === 'UG' ? 'UG (College)' : `Class ${g}`}
                                            </button>
                                        );
                                    })}
                                </div>
                                <small className="form-hint">
                                    Which classes do you teach? Courses you create will only be visible to the students of the classes you select here.
                                </small>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Qualification</label>
                                <input className="form-input" placeholder="e.g. M.Sc Physics" value={teacherInfo.qualification} onChange={e => setTeacherInfo({ ...teacherInfo, qualification: e.target.value })} />
                                <small className="form-hint">Your degree or qualification.</small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Teaching experience</label>
                                <input className="form-input" placeholder="e.g. 5 years" value={teacherInfo.experience} onChange={e => setTeacherInfo({ ...teacherInfo, experience: e.target.value })} />
                                <small className="form-hint">How many years you have been teaching.</small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Subject you want to teach</label>
                                <input className="form-input" placeholder="e.g. Physics" value={teacherInfo.subject} onChange={e => setTeacherInfo({ ...teacherInfo, subject: e.target.value })} />
                                <small className="form-hint">Which subject you want to teach.</small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Why do you want to teach?</label>
                                <textarea className="form-input" rows="2" placeholder="Tell us briefly" value={teacherInfo.reason} onChange={e => setTeacherInfo({ ...teacherInfo, reason: e.target.value })} />
                                <small className="form-hint">Tell the admin briefly why you want to teach.</small>
                            </div>

                            <p className="teacher-request-note">
                                ⚠️ Your teacher account is created only after an admin approves this request. You will not be able to log in until then.
                            </p>
                        </div>
                    )}

                    {/* 🚀 NAYA: Profile image picker */}
                    <div className="form-group">
                        <label className="form-label">Profile Image (optional)</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="form-input" />
                    </div>

                    <button type="submit" className="btn btn-primary">
                        {applyForTeacher ? 'Register & Send Request' : 'Register Now'}
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