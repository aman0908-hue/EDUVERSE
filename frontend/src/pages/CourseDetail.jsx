import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import { UserContext } from '../context/UserContext.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

// 🚀 REQUIREMENT 3.4: View detailed course info and enroll
const CourseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(UserContext);

    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [chapters, setChapters] = useState({});
    const [totalLessons, setTotalLessons] = useState(0);
    const [joined, setJoined] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                // 1. Course details
                const res = await api.get(`/courses/${id}`);
                setCourse(res.data.course);

                // 2. Curriculum (modules + chapters)
                const modRes = await api.get(`/modules/${id}`);
                const fetchedModules = modRes.data.modules || [];
                setModules(fetchedModules);

                let lessonCount = 0;
                const chaptersMap = {};
                await Promise.all(fetchedModules.map(async (mod) => {
                    try {
                        const chapRes = await api.get(`/chapters/${mod._id}`);
                        const chaps = chapRes.data.chapters || [];
                        chaptersMap[mod._id] = chaps;
                        lessonCount += chaps.length;
                    } catch (err) { /* ignore */ }
                }));
                setChapters(chaptersMap);
                setTotalLessons(lessonCount);

                // 3. Join status (sirf logged-in student ke liye)
                if (user && user.role === 'student') {
                    try {
                        const joinedRes = await api.get(`/courses/is-student-joined/${id}`);
                        setJoined(joinedRes.data.joined);
                    } catch (err) { /* ignore */ }
                }
            } catch (error) {
                toast.error('Failed to load course');
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [id, user]);

    // Enroll karna (requirement: POST /enrollement/join)
    const handleEnroll = async () => {
        if (!user) {
            toast.error('Please login to enroll in this course!');
            navigate('/login');
            return;
        }
        setEnrolling(true);
        try {
            await api.post('/enrollement/join', { courseId: id });
            toast.success('Enrolled successfully! 🎉');
            setJoined(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Enrollment failed');
        } finally {
            setEnrolling(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
                <Header />
                <p style={{ textAlign: 'center', marginTop: '80px', color: 'var(--text-muted)' }}>Loading course...</p>
            </div>
        );
    }

    if (!course) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
                <Header />
                <div style={{ textAlign: 'center', marginTop: '80px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Course not found.</p>
                    <Link to="/courses" className="btn btn-primary">Back to Courses</Link>
                </div>
            </div>
        );
    }

    const thumbnailUrl = course.thumbnail ? `${import.meta.env.VITE_API_URL}/uploads/${course.thumbnail}` : null;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-color)', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <div className="dashboard-wrapper" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '30px 20px' }}>
                {/* --- HERO SECTION --- */}
                <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '25px' }}>
                    <div style={{
                        height: '240px',
                        backgroundImage: thumbnailUrl
                            ? `url(${thumbnailUrl})`
                            : 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'flex-end'
                    }}>
                        <div style={{ padding: '25px', width: '100%', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                <span className="badge badge-blue">{course.category}</span>
                                <span className="badge badge-purple">{course.level}</span>
                                <span className="badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>🌐 {course.language}</span>
                            </div>
                            <h1 style={{ color: 'white', margin: 0, fontSize: '2rem', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>{course.title}</h1>
                        </div>
                    </div>

                    <div style={{ padding: '25px' }}>
                        <p style={{ color: '#4b5563', lineHeight: 1.7 }}>{course.description}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            👨‍🏫 Created by <strong>{course.instructor?.name || 'Instructor'}</strong> · 📚 {totalLessons} lessons · 🗂️ {modules.length} modules
                        </p>
                    </div>
                </div>


                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '25px', alignItems: 'start' }}>
                    {/* --- LEFT: CONTENT --- */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        {/* Trailer */}
                        {course.trailerVideo && (
                            <div className="dashboard-card" style={{ padding: '20px' }}>
                                <h3 style={{ marginBottom: '12px' }}>🎬 Course Trailer</h3>
                                <video
                                    src={`${import.meta.env.VITE_API_URL}/uploads/${course.trailerVideo}`}
                                    controls
                                    style={{ width: '100%', borderRadius: '8px' }}
                                />
                            </div>
                        )}

                        {/* Learning Outcomes */}
                        {course.learningOutcomes?.length > 0 && (
                            <div className="dashboard-card" style={{ padding: '20px' }}>
                                <h3 style={{ marginBottom: '12px' }}>🎯 What You Will Learn</h3>
                                <ul style={{ paddingLeft: '20px', lineHeight: 1.9, color: '#4b5563' }}>
                                    {course.learningOutcomes.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Requirements */}
                        {course.requirements?.length > 0 && (
                            <div className="dashboard-card" style={{ padding: '20px' }}>
                                <h3 style={{ marginBottom: '12px' }}>📋 Requirements</h3>
                                <ul style={{ paddingLeft: '20px', lineHeight: 1.9, color: '#4b5563' }}>
                                    {course.requirements.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        )}

                        {/* Curriculum */}
                        <div className="dashboard-card" style={{ padding: '20px' }}>
                            <h3 style={{ marginBottom: '12px' }}>🗂️ Course Curriculum</h3>
                            {modules.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>Curriculum coming soon!</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {modules.map((mod, i) => (
                                        <div key={mod._id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 15px', backgroundColor: '#f9fafb' }}>
                                            <strong style={{ color: '#1f2937' }}>Module {i + 1}: {mod.title}</strong>
                                            {(chapters[mod._id] || []).length > 0 && (
                                                <ul style={{ marginTop: '8px', paddingLeft: '20px', color: '#6b7280', fontSize: '0.9rem' }}>
                                                    {(chapters[mod._id] || []).map(chap => (
                                                        <li key={chap._id}>{chap.title}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>


                    {/* --- RIGHT: ENROLL CARD --- */}
                    <div className="dashboard-card" style={{ padding: '25px', position: 'sticky', top: '20px' }}>
                        <h2 style={{ margin: '0 0 5px 0', fontSize: '2rem', color: '#1f2937' }}>
                            {course.price === 0 || !course.price ? 'Free' : `₹${course.price}`}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', margin: '0 0 18px 0', fontSize: '0.9rem' }}>
                            {course.price === 0 || !course.price ? 'This course is completely free!' : 'One-time payment, lifetime access.'}
                        </p>

                        {user?.role === 'teacher' ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                                You are logged in as a Teacher.
                            </p>
                        ) : joined ? (
                            <>
                                <button className="btn btn-primary" style={{ width: '100%', backgroundColor: '#16a34a', borderColor: '#16a34a' }} onClick={() => navigate(`/learn/${course._id}`)}>
                                    ✅ Enrolled — Continue Learning
                                </button>
                                <p style={{ textAlign: 'center', color: '#16a34a', fontSize: '0.85rem', marginTop: '10px' }}>
                                    You are enrolled in this course!
                                </p>
                            </>
                        ) : (
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleEnroll} disabled={enrolling}>
                                {enrolling ? 'Enrolling...' : 'Enroll Now'}
                            </button>
                        )}

                        <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '18px', paddingTop: '15px', fontSize: '0.9rem', color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span>✅ {totalLessons} lessons</span>
                            <span>🗂️ {modules.length} modules</span>
                            <span>♾️ Lifetime access</span>
                            <span>📜 Quiz & progress tracking</span>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default CourseDetail;
