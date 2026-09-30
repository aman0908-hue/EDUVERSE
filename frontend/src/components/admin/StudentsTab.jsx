import { useEffect, useState } from 'react';
import { Award, BookOpen, ChevronDown, GraduationCap, Search } from 'lucide-react';
import api from '../../utils/api.js';
import toast from 'react-hot-toast';
import { formatDate, money, relativeTime, EmptyState, StatChip, ProgressBar } from './shared.jsx';

// Students tab — har student ka update: kaunsi course me enrolled hai,
// kitne lecture complete, quiz score, last activity kab tha
const StudentsTab = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState({});

    useEffect(() => {
        let alive = true;
        const timer = setTimeout(() => {
            api.get('/admin/reports/students', { params: { search } })
                .then(res => alive && setStudents(res.data.students || []))
                .catch(err => alive && toast.error(err.response?.data?.message || 'Students could not be loaded.'))
                .finally(() => alive && setLoading(false));
        }, 250);
        return () => { alive = false; clearTimeout(timer); };
    }, [search]);

    const toggle = id => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading && students.length === 0) return <EmptyState text="Loading students..." />;

    return (
        <section className="dashboard-card admin-card">
            <div className="admin-card-heading">
                <div>
                    <h2 className="card-title">Student Reports</h2>
                    <p className="card-text">Enrollment, progress, quiz scores and last activity for every student. Click any row for full details.</p>
                </div>
                <div className="admin-search">
                    <Search size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student name or email" />
                </div>
            </div>

            {students.length === 0 ? <EmptyState text="No students found." /> : (
                <div className="admin-report-list">
                    {students.map(student => (
                        <div className="admin-report" key={student._id}>
                            <button className="admin-report-head" onClick={() => toggle(student._id)}>
                                <div className="admin-report-who">
                                    <strong>{student.name}</strong>
                                    <small>{student.email} · Joined {formatDate(student.joinedAt)}</small>
                                </div>
                                <div className="admin-report-chips">
                                    <StatChip icon={BookOpen} value={student.enrollmentCount} label="courses" tone="blue" />
                                    <StatChip icon={GraduationCap} value={`${student.overallPercent}%`} label="progress" tone="green" />
                                    <StatChip icon={Award} value={student.avgScore ?? '—'} label="avg score" tone="purple" />
                                    <span className={`status-pill ${student.isActive ? 'active' : 'inactive'}`}>{student.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                                <div className="admin-report-meta">
                                    <span>{relativeTime(student.lastActivity)}</span>
                                    <ChevronDown size={18} className={open[student._id] ? 'rotate' : ''} />
                                </div>
                            </button>

                            {open[student._id] && (
                                <div className="admin-report-body">
                                    <div className="admin-progress-summary">
                                        <div>
                                            <span>Overall progress</span>
                                            <strong>{student.overallPercent}%</strong>
                                            <ProgressBar value={student.overallPercent} tone="green" />
                                        </div>
                                        <div>
                                            <span>Lectures completed</span>
                                            <strong>{student.completedLessons} / {student.totalEnrolledLessons}</strong>
                                        </div>
                                        <div>
                                            <span>Quiz attempts</span>
                                            <strong>{student.quizAttempts}</strong>
                                        </div>
                                        <div>
                                            <span>Courses done</span>
                                            <strong>{student.completedCourses} / {student.enrollmentCount}</strong>
                                        </div>
                                    </div>

                                    <h4>Enrolled Courses ({student.courses.length})</h4>
                                    {student.courses.length === 0 ? <EmptyState text="This student has not enrolled in any course yet." /> : (
                                        <div className="admin-sub-grid">
                                            {student.courses.map(course => (
                                                <div className="admin-sub-card" key={course._id}>
                                                    <div className="admin-sub-head">
                                                        <strong>{course.title}</strong>
                                                        <span className="admin-percent">{course.percent}%</span>
                                                    </div>
                                                    <small>{course.teacher ? `Teacher: ${course.teacher}` : 'Teacher deleted'} · {course.category} · {money(course.price)}</small>
                                                    <div className="admin-sub-chips">
                                                        <StatChip value={`${course.completedLessons}/${course.totalLessons}`} label="lectures" tone="blue" />
                                                        <StatChip value={course.quizAttempts.length} label="quizzes" tone="purple" />
                                                        <StatChip value={formatDate(course.enrolledAt)} label="enrolled" tone="green" />
                                                    </div>
                                                    <ProgressBar value={course.percent} tone="green" />
                                                    {course.quizAttempts.length > 0 && (
                                                        <ul className="admin-mini-list">
                                                            {course.quizAttempts.map(attempt => (
                                                                <li key={attempt.lessonId || attempt.lessonTitle}>
                                                                    <span>{attempt.lessonTitle}</span>
                                                                    <small>{attempt.score}/{attempt.totalMarks} · {attempt.percent}%</small>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
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

export default StudentsTab;
