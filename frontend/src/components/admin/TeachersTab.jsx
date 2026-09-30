import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, GraduationCap, Layers, Search } from 'lucide-react';
import api from '../../utils/api.js';
import toast from 'react-hot-toast';
import { formatDate, money, relativeTime, EmptyState, StatChip } from './shared.jsx';

// Teachers tab — har teacher ka poora record: kitne courses banaye, kitne lectures,
// kitne quizzes, kitne students enrolled, kitna revenue, aur kaunsa student kitna padh raha hai
const TeachersTab = () => {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState({});

    useEffect(() => {
        let alive = true;
        const timer = setTimeout(() => {
            api.get('/admin/reports/teachers', { params: { search } })
                .then(res => alive && setTeachers(res.data.teachers || []))
                .catch(err => alive && toast.error(err.response?.data?.message || 'Teachers could not be loaded.'))
                .finally(() => alive && setLoading(false));
        }, 250);
        return () => { alive = false; clearTimeout(timer); };
    }, [search]);

    const toggle = id => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading && teachers.length === 0) return <EmptyState text="Loading teachers..." />;

    return (
        <section className="dashboard-card admin-card">
            <div className="admin-card-heading">
                <div>
                    <h2 className="card-title">Teacher Reports</h2>
                    <p className="card-text">Courses, content, students and revenue for every teacher. Click any row for the complete record.</p>
                </div>
                <div className="admin-search">
                    <Search size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search teacher name or email" />
                </div>
            </div>

            {teachers.length === 0 ? <EmptyState text="No teachers found." /> : (
                <div className="admin-report-list">
                    {teachers.map(teacher => (
                        <div className="admin-report" key={teacher._id}>
                            <button className="admin-report-head" onClick={() => toggle(teacher._id)}>
                                <div className="admin-report-who">
                                    <strong>{teacher.name}</strong>
                                    <small>{teacher.email} · Joined {formatDate(teacher.joinedAt)}</small>
                                </div>
                                <div className="admin-report-chips">
                                    <StatChip icon={BookOpen} value={teacher.courseCount} label="courses" tone="blue" />
                                    <StatChip icon={GraduationCap} value={teacher.studentCount} label="students" tone="green" />
                                    <StatChip icon={Layers} value={teacher.lessonCount} label="lectures" tone="purple" />
                                    <span className={`status-pill ${teacher.isActive ? 'active' : 'inactive'}`}>{teacher.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div className="admin-report-meta">
                                    <span>{money(teacher.revenue)} revenue</span>
                                    <small>{relativeTime(teacher.lastActivity)}</small>
                                    <ChevronDown size={18} className={open[teacher._id] ? 'rotate' : ''} />
                                </div>
                            </button>

                            {open[teacher._id] && (
                                <div className="admin-report-body">
                                    <div className="admin-sub-grid">
                                        <div>
                                            <h4>Courses ({teacher.courses.length})</h4>
                                            {teacher.courses.length === 0 ? <EmptyState text="No courses created." /> : teacher.courses.map(course => (
                                                <div className="admin-sub-card" key={course._id}>
                                                    <div className="admin-sub-head">
                                                        <strong>{course.title}</strong>
                                                        <span className="status-pill active">Published</span>
                                                    </div>
                                                    <small>{course.category} · {course.level} · {money(course.price)}</small>
                                                    <div className="admin-sub-chips">
                                                        <StatChip value={course.modules} label="modules" tone="blue" />
                                                        <StatChip value={course.chapters} label="chapters" tone="blue" />
                                                        <StatChip value={course.lessons} label="lectures" tone="purple" />
                                                        <StatChip value={course.enrolled} label="enrolled" tone="green" />
                                                    </div>
                                                    {course.students.length > 0 && (
                                                        <ul className="admin-mini-list">
                                                            {course.students.map(s => (
                                                                <li key={s._id || s.email}><span>{s.name || 'Deleted student'}</span><small>{s.email || '—'} · {formatDate(s.enrolledAt)}</small></li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div>
                                            <h4>Enrolled Students ({teacher.students.length})</h4>
                                            {teacher.students.length === 0 ? <EmptyState text="No student enrolled yet." /> : (
                                                <ul className="admin-mini-list">
                                                    {teacher.students.map(s => (
                                                        <li key={`${s._id}-${s.course}`}>
                                                            <span>{s.name || 'Deleted student'} <em>{s.course}</em></span>
                                                            <small>{s.completedLessons} lectures done · {s.quizAttempts} quiz attempts · {relativeTime(s.lastActivity)}</small>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};

export default TeachersTab;
