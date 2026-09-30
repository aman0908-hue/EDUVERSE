import { useEffect, useState } from 'react';
import { Search, UserCheck } from 'lucide-react';
import api from '../../utils/api.js';
import toast from 'react-hot-toast';
import { formatDateTime, money, EmptyState } from './shared.jsx';

// Enrollments tab — kaun student, kis course me, kab enroll hua (flat searchable list)
const EnrollmentsTab = () => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        let alive = true;
        const timer = setTimeout(() => {
            api.get('/admin/reports/enrollments', { params: { search } })
                .then(res => alive && setEnrollments(res.data.enrollments || []))
                .catch(err => alive && toast.error(err.response?.data?.message || 'Enrollments could not be loaded.'))
                .finally(() => alive && setLoading(false));
        }, 250);
        return () => { alive = false; clearTimeout(timer); };
    }, [search]);

    return (
        <section className="dashboard-card admin-card">
            <div className="admin-card-heading">
                <div>
                    <h2 className="card-title">All Enrollments</h2>
                    <p className="card-text">Every enrollment — student, course, teacher and date. {enrollments.length} records shown.</p>
                </div>
                <div className="admin-search">
                    <Search size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, email or course" />
                </div>
            </div>

            {loading && enrollments.length === 0 ? <EmptyState text="Loading enrollments..." />
                : enrollments.length === 0 ? <EmptyState text="No enrollments found." /> : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Course</th>
                                    <th>Teacher</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Enrolled At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrollments.map(item => (
                                    <tr key={item._id}>
                                        <td>
                                            <strong>{item.student?.name || 'Deleted student'}</strong>
                                            <small>{item.student?.email || '—'}</small>
                                        </td>
                                        <td>{item.course?.title || 'Deleted course'}</td>
                                        <td>{item.course?.teacher || '—'}</td>
                                        <td>{item.course?.category || '—'}</td>
                                        <td>{money(item.course?.price)}</td>
                                        <td>{formatDateTime(item.enrolledAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            <p className="admin-note"><UserCheck size={14} /> Only published courses with valid student records are shown. Drafts and deleted records are hidden — manage them in the Drafts &amp; Cleanup tab.</p>
        </section>
    );
};

export default EnrollmentsTab;
