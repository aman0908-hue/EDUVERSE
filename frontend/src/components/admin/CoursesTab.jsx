import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, GraduationCap, Layers, Search } from 'lucide-react';
import api from '../../utils/api.js';
import toast from 'react-hot-toast';
import { formatDate, money, EmptyState, StatChip } from './shared.jsx';

// Courses tab — har course ka content (modules/chapters/lectures/quizzes),
// kaunsa teacher bana raha hai aur kaun kaun enrolled hai
const CoursesTab = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState({});

    useEffect(() => {
        let alive = true;
        const timer = setTimeout(() => {
            api.get('/admin/reports/courses', { params: { search } })
                .then(res => alive && setCourses(res.data.courses || []))
                .catch(err => alive && toast.error(err.response?.data?.message || 'Courses could not be loaded.'))
                .finally(() => alive && setLoading(false));
        }, 250);
        return () => { alive = false; clearTimeout(timer); };
    }, [search]);

    const toggle = id => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading && courses.length === 0) return <EmptyState text="Loading courses..." />;

    return (
        <section className="dashboard-card admin-card">
            <div className="admin-card-heading">
                <div>
                    <h2 className="card-title">Course Reports</h2>
                    <p className="card-text">Course content, teacher and enrolled students. Click any row to see the full list.</p>
                </div>
                <div className="admin-search">
                    <Search size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search course, category or level" />
                </div>
            </div>

            {courses.length === 0 ? <EmptyState text="No courses found." /> : (
                <div className="admin-report-list">
                    {courses.map(course => (
                        <div className="admin-report" key={course._id}>
                            <button className="admin-report-head" onClick={() => toggle(course._id)}>
                                <div className="admin-report-who">
                                    <strong>{course.title}</strong>
                                    <small>{course.teacher ? `Teacher: ${course.teacher.name}` : 'Teacher deleted'} · {course.category} · {course.level} · {course.language}</small>
                                </div>
                                <div className="admin-report-chips">
                                    <StatChip icon={Layers} value={course.lessons} label="lectures" tone="purple" />
                                    <StatChip icon={GraduationCap} value={course.enrolled} label="enrolled" tone="green" />
                                    <span className="status-pill active">Published</span>
                                </div>
                                <div className="admin-report-meta">
                                    <span>{money(course.revenue)}</span>
                                    <ChevronDown size={18} className={open[course._id] ? 'rotate' : ''} />
                                </div>
                            </button>

                            {open[course._id] && (
                                <div className="admin-report-body">
                                    <div className="admin-sub-chips">
                                        <StatChip icon={BookOpen} value={course.modules} label="modules" tone="blue" />
                                        <StatChip value={course.chapters} label="chapters" tone="blue" />
                                        <StatChip value={course.lessons} label="lectures" tone="purple" />
                                        <StatChip value={course.quizzes} label="quiz questions" tone="purple" />
                                        <StatChip value={money(course.price)} label="price" tone="green" />
                                        <StatChip value={formatDate(course.createdAt)} label="created" tone="blue" />
                                    </div>
                                    {course.lastLesson && (
                                        <p className="admin-note">Latest lecture: <strong>{course.lastLesson.title}</strong> ({formatDate(course.lastLesson.createdAt)})</p>
                                    )}
                                    <h4>Enrolled Students ({course.students.length})</h4>
                                    {course.students.length === 0 ? <EmptyState text="No student has enrolled yet." /> : (
                                        <ul className="admin-mini-list">
                                            {course.students.map(s => (
                                                <li key={s._id || s.email}>
                                                    <span>{s.name || 'Deleted student'} {s.isActive === false && <em>inactive</em>}</span>
                                                    <small>{s.email || '—'} · joined {formatDate(s.enrolledAt)}</small>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default CoursesTab;
