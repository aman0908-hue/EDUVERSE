import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import { UserContext } from '../context/UserContext.jsx';
import CourseCard from '../components/CourseCard.jsx';
import StudentLayout from '../layouts/StudentLayout.jsx';

// 🚀 REQUIREMENT 3.4: Browse courses with filters (category, language, level) + pagination
const Courses = () => {
    const { user } = useContext(UserContext);

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [filters, setFilters] = useState({
        search: '',
        category: '',
        language: '',
        level: ''
    });

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
        setCurrentPage(1); // Filter badalne par page 1 se start
    };

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const params = { page: currentPage, limit: 6 };
                Object.keys(filters).forEach(key => {
                    if (filters[key]) params[key] = filters[key];
                });

                const res = await api.get('/courses/all', { params });
                setCourses(res.data.courses || []);
                setTotalPages(res.data.totalPages || 1);
            } catch (error) {
                toast.error('Failed to load courses');
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [filters, currentPage]);

    return (
        <StudentLayout>
            <div className="dashboard-wrapper">
                <div className="dashboard-header" style={{ borderBottom: 'none', marginBottom: '10px' }}>
                    <div>
                        <h1 className="dashboard-title">Browse Courses</h1>
                        <p className="subtitle" style={{ textAlign: 'left' }}>
                            {user ? `Hi ${user.name}! ` : ''}Find the perfect course to level up your skills.
                        </p>
                    </div>
                </div>

                {/* --- FILTER BAR --- */}
                <div className="dashboard-card" style={{ padding: '18px', marginBottom: '25px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '12px' }}>
                        <input
                            type="text"
                            name="search"
                            value={filters.search}
                            onChange={handleFilterChange}
                            placeholder="🔍 Search by title..."
                            className="form-control"
                        />
                        <select name="category" value={filters.category} onChange={handleFilterChange} className="form-control">
                            <option value="">All Categories</option>
                            <option value="Programming">Programming</option>
                            <option value="Design">Design</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Business">Business</option>
                        </select>
                        <select name="language" value={filters.language} onChange={handleFilterChange} className="form-control">
                            <option value="">All Languages</option>
                            <option value="Hindi">Hindi</option>
                            <option value="English">English</option>
                            <option value="Hinglish">Hinglish</option>
                        </select>
                        <select name="level" value={filters.level} onChange={handleFilterChange} className="form-control">
                            <option value="">All Levels</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>
                </div>

                {/* --- COURSE GRID --- */}
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading courses...</p>
                ) : courses.length === 0 ? (
                    <div className="dashboard-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No courses found. Try changing the filters!</p>
                    </div>
                ) : (
                    <div className="dashboard-grid">
                        {courses.map((course) => (
                            <CourseCard key={course._id} course={course} />
                        ))}
                    </div>
                )}

                {/* --- PAGINATION --- */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '35px' }}>
                        <button
                            className="btn btn-outline"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            style={{ opacity: currentPage === 1 ? 0.5 : 1 }}>
                            ← Prev
                        </button>
                        <span style={{ fontWeight: '600', color: '#374151' }}>Page {currentPage} of {totalPages}</span>
                        <button
                            className="btn btn-outline"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}>
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};

export default Courses;
