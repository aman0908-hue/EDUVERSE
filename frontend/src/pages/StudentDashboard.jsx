import { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api.js';

const StudentDashboard = () => {
    const { user } = useContext(UserContext);
    
    // NAYA: Enrolled courses with Progress Data
    const [dashboardData, setDashboardData] = useState([]); 
    const [availableCourses, setAvailableCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dashboard ka data load karna (Old + New logic merged)
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            // 1. Backend se saare courses fetch karna
            const allCoursesRes = await api.get('/courses');
            const allCourses = allCoursesRes.data.courses || [];

            // 2. Sirf Enrolled courses aur unki Progress fetch karna
            if (user?._id) {
                // Pehle standard enrolled courses fetch karein
                const enrolledRes = await api.get(`/courses/my-courses/${user._id}`);
                const enrolled = enrolledRes.data.courses || [];

                // Phir unki progress nikal lein
                let progressMap = {};
                try {
                    const progressRes = await api.get(`/progress/dashboard/student/${user._id}`);
                    const pData = progressRes.data.dashboardData || [];
                    // Progress data ko map mein daalna taaki course ke sath jod sakein
                    pData.forEach(p => {
                        if(p.course && p.course._id) {
                            progressMap[p.course._id] = p;
                        }
                    });
                } catch(err) {
                    console.log("No progress found yet");
                }

                // Enrolled course aur Progress ko aapas mein jod (merge) dena
                const combinedData = enrolled.map(course => {
                    const prog = progressMap[course._id];
                    return {
                        course: course,
                        completedLessons: prog ? prog.completedLessons : 0,
                        totalLessons: prog ? prog.totalLessons : 0,
                        progressPercentage: prog ? prog.progressPercentage : 0,
                        quizAttempts: prog ? (prog.quizAttempts || []) : []
                    };
                });
                
                setDashboardData(combinedData);

                // 3. Jo courses enroll ho chuke hain, unhe Available list se hata dena
                const enrolledIds = enrolled.map(c => c._id);
                const available = allCourses.filter(c => !enrolledIds.includes(c._id));
                setAvailableCourses(available);
            } else {
                setAvailableCourses(allCourses);
            }
        } catch (error) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [user]);

    // Enroll button click handler
    const handleEnroll = async (courseId, courseTitle) => {
        try {
            if (!user?._id) {
                toast.error("Please login to enroll");
                return;
            }
            
            const response = await api.post('/courses/enroll', {
                studentId: user._id,
                courseId: courseId
            });
            
            if (response.data.success) {
                toast.success(`Successfully enrolled in ${courseTitle}!`);
                loadDashboardData(); // Data reload karega taaki course upar shift ho jaye
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to enroll");
        }
    };

    return (
        <div>
            {/* 🚀 Navbar ab StudentLayout (components/Header) se aata hai — duplicate hataya gaya */}
            <div className="dashboard-wrapper">
                <div className="dashboard-header" style={{ borderBottom: 'none', marginBottom: '10px' }}>
                    <div>
                        <h1 className="dashboard-title">Student Dashboard</h1>
                        <p className="subtitle" style={{ textAlign: 'left' }}>Explore and learn new skills.</p>
                    </div>
                </div>

                <div className="stats-container">
                    <div className="stat-box">
                        <span className="stat-value">{dashboardData.length}</span>
                        <span className="stat-label">Enrolled Courses</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value">0</span>
                        <span className="stat-label">Certificates</span>
                    </div>
                </div>

                {/* --- SECTION 1: MY ENROLLED COURSES (Now with Progress) --- */}
                <h2 className="main-title" style={{ fontSize: '1.5rem', textAlign: 'left', marginTop: '30px', marginBottom: '20px' }}>My Enrolled Courses</h2>
                
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading your courses...</p>
                ) : (
                    <div className="dashboard-grid">
                        {dashboardData.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>You haven't enrolled in any courses yet.</p>
                        ) : (
                            dashboardData.map((data) => (
                                <div className="dashboard-card" key={data.course._id} style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className="badge badge-green" style={{ alignSelf: 'flex-start' }}>Enrolled</span>
                                    <h3 className="card-title" style={{ marginTop: '10px', fontSize: '1.4rem' }}>{data.course.title}</h3>
                                    
                                    {/* NAYA: Progress Bar aur Quiz Stats */}
                                    <div style={{ marginTop: '15px', marginBottom: '15px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>
                                            <span>{data.completedLessons} / {data.totalLessons || 0} Lessons</span>
                                            <span style={{ fontWeight: 'bold', color: data.progressPercentage === 100 ? '#16a34a' : '#4f46e5' }}>
                                                {data.progressPercentage}%
                                            </span>
                                        </div>
                                        <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '10px', height: '8px', overflow: 'hidden', marginBottom: '10px' }}>
                                            <div style={{ 
                                                height: '100%', 
                                                backgroundColor: data.progressPercentage === 100 ? '#22c55e' : '#4f46e5', 
                                                width: `${data.progressPercentage}%`,
                                                transition: 'width 0.5s ease'
                                            }}></div>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: 0 }}>
                                            📝 Quizzes Attempted: <strong>{data.quizAttempts?.length || 0}</strong>
                                        </p>
                                    </div>

                                    <div className="card-action" style={{ marginTop: 'auto' }}>
                                        {/* YAHAN UPDATE KIYA HAI: /learn/ */}
                                        <Link 
                                            to={`/learn/${data.course._id}`} 
                                            className="btn btn-primary" 
                                            style={{ width: '100%', backgroundColor: data.progressPercentage === 100 ? '#10b981' : '#16a34a', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                                            {data.progressPercentage === 100 ? 'Review Course' : 'Continue Learning'}
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- SECTION 2: AVAILABLE COURSES (Same as before) --- */}
                <h2 className="main-title" style={{ fontSize: '1.5rem', textAlign: 'left', marginTop: '50px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Available Courses</span>
                    {/* 🚀 NAYA: Full browse page with filters + pagination */}
                    <Link to="/courses" className="btn btn-outline" style={{ fontSize: '0.85rem', textDecoration: 'none' }}>
                        Browse All Courses →
                    </Link>
                </h2>
                
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading amazing courses for you...</p>
                ) : (
                    <div className="dashboard-grid">
                        {availableCourses.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No new courses available right now. Check back later!</p>
                        ) : (
                            availableCourses.map((course) => (
                                <div className="dashboard-card" key={course._id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="badge badge-blue">{course.category || 'General'}</span>
                                        {course.price === 0 || !course.price ? (
                                            <span className="badge badge-green" style={{ background: '#dcfce7', color: '#166534' }}>Free</span>
                                        ) : (
                                            <span className="badge" style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }}>Paid: ₹{course.price}</span>
                                        )}
                                    </div>
                                    
                                    <h3 className="card-title" style={{ marginTop: '10px', fontSize: '1.4rem' }}>{course.title}</h3>
                                    <p className="card-text" style={{ marginBottom: '15px', height: '45px', overflow: 'hidden' }}>{course.description}</p>
                                    
                                    <div className="card-action">
                                        <button 
                                            onClick={() => handleEnroll(course._id, course.title)} 
                                            className="btn btn-primary" 
                                            style={{ width: '100%' }}>
                                            Enroll Now
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;