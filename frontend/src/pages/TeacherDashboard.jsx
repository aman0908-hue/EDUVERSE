import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api.js';

const TeacherDashboard = () => {
    const { user } = useContext(UserContext);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Courses Fetch Karna
    useEffect(() => {
        const fetchCourses = async () => {
            try {
                if (user?._id) {
                    const response = await api.get(`/courses/instructor/${user._id}`);
                    setCourses(response.data.courses);
                }
            } catch (error) {
                toast.error("Failed to load courses");
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [user]);

    // COURSE DELETE KARNE KA LOGIC
    const handleDelete = async (courseId) => {
        // Delete karne se pehle ek warning pop-up denge
        if (window.confirm("Are you sure you want to delete this course permanently? This action cannot be undone.")) {
            try {
                await api.delete(`/courses/${courseId}`); // Backend ko delete karne bolo
                
                // Screen se bhi course turant hata do (bina refresh kiye)
                setCourses(courses.filter((course) => course._id !== courseId));
                
                toast.success("Course completely deleted!");
            } catch (error) {
                toast.error("Failed to delete course");
            }
        }
    };

    return (
        <div>
            {/* 🚀 Navbar ab TeacherLayout (components/Header) se aata hai — duplicate hataya gaya */}
            <div className="dashboard-wrapper">
                <div className="dashboard-header" style={{ borderBottom: 'none', marginBottom: '10px' }}>
                    <div>
                        <h1 className="dashboard-title">Instructor Overview</h1>
                        <p className="subtitle" style={{ textAlign: 'left' }}>Manage your courses and track student performance.</p>
                    </div>
                    <Link to="/create-course" className="btn btn-primary" style={{ width: 'auto', textDecoration: 'none', display: 'inline-block' }}>
                        + Create New Course
                    </Link>
                </div>

                <div className="stats-container">
                    <div className="stat-box">
                        <span className="stat-value">0</span>
                        <span className="stat-label">Total Students</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value" style={{ color: '#f59e0b', fontSize: '1.8rem' }}>New</span>
                        <span className="stat-label">Instructor Rating</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value">{courses.length}</span>
                        <span className="stat-label">Active Courses</span>
                    </div>
                </div>

                <h2 className="main-title" style={{ fontSize: '1.5rem', textAlign: 'left', marginTop: '30px', marginBottom: '20px' }}>Manage Courses</h2>
                
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading your courses...</p>
                ) : (
                    <div className="dashboard-grid">
                        {courses.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>You haven't created any courses yet.</p>
                        ) : (
                            courses.map((course) => (
                                <div className="dashboard-card" key={course._id}>
                                    <span className="badge badge-purple">{course.category}</span>
                                    <h3 className="card-title" style={{ marginTop: '10px' }}>{course.title}</h3>
                                    
                                    <p className="card-text" style={{ marginBottom: '15px', fontWeight: 'bold' }}>
                                        {course.price === 0 || !course.price ? (
                                            <span style={{ color: '#166534' }}>Free Course</span>
                                        ) : (
                                            <span style={{ color: '#854d0e' }}>Price: ₹{course.price}</span>
                                        )}
                                    </p>

                                    <div className="card-action" style={{ display: 'flex', gap: '10px' }}>
                                        {/* YAHAN UPDATE KIYA HAI: Naya Edit/Add Videos ka Link */}
                                        <Link 
                                            to={`/edit-course/${course._id}`} 
                                            className="btn btn-outline" 
                                            style={{ flex: 1, padding: '8px 10px', fontSize: '0.9rem', textDecoration: 'none', textAlign: 'center' }}>
                                            Edit / Add Videos
                                        </Link>
                                        
                                        <button 
                                            onClick={() => handleDelete(course._id)} 
                                            className="btn btn-outline" 
                                            style={{ flex: 1, padding: '8px 10px', fontSize: '0.9rem', color: '#dc2626', borderColor: '#dc2626' }}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                        
                        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderStyle: 'dashed', borderWidth: '2px' }}>
                            <h3 className="card-title" style={{ marginBottom: '15px' }}>Start a New Course</h3>
                            <Link to="/create-course" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none' }}>
                                + Create New Course
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherDashboard;