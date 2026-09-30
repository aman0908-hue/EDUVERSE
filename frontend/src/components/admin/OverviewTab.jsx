import { useEffect, useState } from 'react';
import { BookOpen, FolderTree, GraduationCap, Layers, TrendingUp, UserCheck, Users, Wallet, Activity, FileQuestion } from 'lucide-react';
import api from '../../utils/api.js';
import { formatDateTime, money, relativeTime, StatGrid, EmptyState } from './shared.jsx';

// Overview tab — platform ka poora snapshot: kitne users/teachers/students,
// kitne courses, kitne enrollments, revenue, top courses aur latest activity
const OverviewTab = () => {
    const [data, setData] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        Promise.all([
            api.get('/admin/overview'),
            api.get('/admin/reports/activity')
        ])
            .then(([overview, feed]) => {
                if (!alive) return;
                setData(overview.data);
                setActivity(feed.data.activity || []);
            })
            .catch(() => alive && setData(null))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, []);

    if (loading) return <EmptyState text="Loading platform overview..." />;
    if (!data?.stats) return <EmptyState text="Overview data could not be loaded." />;

    const { stats, categories = [], topCourses = [], recentEnrollments = [] } = data;
    const cards = [
        ['Total Users', stats.users.total, Users, '#2563eb', `${stats.users.active} active · ${stats.users.inactive} inactive`],
        ['Students', stats.students.total, GraduationCap, '#16a34a', `${stats.students.active} active`],
        ['Teachers', stats.teachers.total, UserCheck, '#ea580c', `${stats.teachers.active} active`],
        ['Courses', stats.courses.total, BookOpen, '#7c3aed', `${stats.courses.published} published · ${stats.courses.draft} draft`],
        ['Enrollments', stats.enrollments, TrendingUp, '#0891b2', 'Total enrollments'],
        ['Revenue', money(stats.revenue), Wallet, '#ca8a04', 'From enrollments'],
        ['Lessons', stats.content.lessons, Layers, '#4f46e5', `${stats.content.modules} modules · ${stats.content.chapters} chapters`],
        ['Quizzes', stats.content.quizzes, FileQuestion, '#db2777', 'Total quiz questions'],
        ['Hidden Data', stats.hidden.draftCourses + stats.hidden.draftEnrollments + stats.hidden.orphanEnrollments, FileQuestion, '#64748b', 'Drafts + deleted records']
    ];

    const maxEnroll = Math.max(1, ...categories.map(c => c.enrollments));

    return (
        <>
            <StatGrid items={cards} />

            <div className="admin-columns">
                <section className="dashboard-card admin-card">
                    <div className="admin-card-heading">
                        <div>
                            <h2 className="card-title">Top Courses (by enrollment)</h2>
                            <p className="card-text">Courses with the highest number of enrollments.</p>
                        </div>
                        <TrendingUp size={22} color="#2563eb" />
                    </div>
                    {topCourses.length === 0 ? <EmptyState text="No courses yet." /> : (
                        <div className="admin-bar-list">
                            {topCourses.map(course => (
                                <div className="admin-bar-row" key={course._id}>
                                    <div className="admin-bar-head">
                                        <strong>{course.title}</strong>
                                        <span>{course.enrolled} enrolled · {money(course.revenue)}</span>
                                    </div>
                                    <div className="admin-progress">
                                        <span className="admin-progress-fill blue" style={{ width: `${(course.enrolled / maxEnroll) * 100}%` }} />
                                    </div>
                                    <small className="admin-bar-meta">{course.category} · Published</small>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="dashboard-card admin-card">
                    <div className="admin-card-heading">
                        <div>
                            <h2 className="card-title">Category Breakdown</h2>
                            <p className="card-text">Courses and enrollments grouped by category.</p>
                        </div>
                        <FolderTree size={22} color="#7c3aed" />
                    </div>
                    {categories.length === 0 ? <EmptyState text="No category data." /> : (
                        <div className="admin-bar-list">
                            {categories.map(cat => (
                                <div className="admin-bar-row" key={cat.category}>
                                    <div className="admin-bar-head">
                                        <strong>{cat.category}</strong>
                                        <span>{cat.enrollments} enrollments · {cat.courses} courses</span>
                                    </div>
                                    <div className="admin-progress">
                                        <span className="admin-progress-fill purple" style={{ width: `${(cat.enrollments / maxEnroll) * 100}%` }} />
                                    </div>
                                    <small className="admin-bar-meta">{cat.published} published · {money(cat.revenue)} revenue</small>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <div className="admin-columns">
                <section className="dashboard-card admin-card">
                    <div className="admin-card-heading">
                        <div>
                            <h2 className="card-title">Latest Enrollments</h2>
                            <p className="card-text">Who enrolled in which course recently.</p>
                        </div>
                        <GraduationCap size={22} color="#16a34a" />
                    </div>
                    {recentEnrollments.length === 0 ? <EmptyState text="No enrollments yet." /> : (
                        <ul className="admin-list">
                            {recentEnrollments.map(item => (
                                <li key={item._id}>
                                    <div>
                                        <strong>{item.student || 'Deleted student'}</strong>
                                        <small>{item.studentEmail || '—'}</small>
                                    </div>
                                    <div className="admin-list-right">
                                        <span>{item.course || 'Deleted course'}</span>
                                        <small>{formatDateTime(item.enrolledAt)}</small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="dashboard-card admin-card">
                    <div className="admin-card-heading">
                        <div>
                            <h2 className="card-title">Recent Activity</h2>
                            <p className="card-text">The most recent events across the platform.</p>
                        </div>
                        <Activity size={22} color="#ea580c" />
                    </div>
                    {activity.length === 0 ? <EmptyState text="No recent activity." /> : (
                        <ul className="admin-list">
                            {activity.map(item => (
                                <li key={item.id}>
                                    <div>
                                        <strong>{item.text}</strong>
                                        {item.meta && <small>{item.meta}</small>}
                                    </div>
                                    <div className="admin-list-right">
                                        <span className={`admin-dot ${item.type}`} />
                                        <small>{relativeTime(item.at)}</small>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
};

export default OverviewTab;
