import { useEffect, useState } from 'react';
import { AlertTriangle, Eraser, RefreshCw, Trash2, X } from 'lucide-react';
import api from '../../utils/api.js';
import toast from 'react-hot-toast';
import { formatDate, EmptyState, StatChip } from './shared.jsx';

// Cleanup tab — draft courses aur deleted (orphan) records yahan hote hain.
// Admin inhe yahan se permanently delete kar sakta hai; baaki tabs me ye data hidden rehta hai.
const CleanupTab = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/reports/cleanup');
            setData(res.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cleanup data could not be loaded.');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const deleteDraft = async course => {
        setBusy(true);
        try {
            const res = await api.delete(`/admin/reports/cleanup/draft/${course._id}`);
            toast.success(res.data.message);
            setConfirm(null);
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Draft course could not be deleted.');
        } finally { setBusy(false); }
    };

    const purge = async () => {
        setBusy(true);
        try {
            const res = await api.post('/admin/reports/cleanup/purge');
            toast.success(res.data.message);
            setConfirm(null);
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cleanup could not be completed.');
        } finally { setBusy(false); }
    };

    if (loading && !data) return <EmptyState text="Loading cleanup data..." />;
    if (!data) return <EmptyState text="Cleanup data could not be loaded." />;

    const { totals, draftCourses = [], orphanEnrollments = [], orphanContent = {} } = data;
    const isEmpty = !totals.draftCourses && !totals.orphanEnrollments && !totals.orphanContent;

    return (
        <>
            <section className="dashboard-card admin-card">
                <div className="admin-card-heading">
                    <div>
                        <h2 className="card-title">Drafts &amp; Deleted Data</h2>
                        <p className="card-text">
                            Draft courses and records of deleted students or courses are hidden from every other tab.
                            You can permanently remove them from here.
                        </p>
                    </div>
                    <div className="admin-cleanup-actions">
                        <button className="btn btn-outline" onClick={load} disabled={busy}>
                            <RefreshCw size={15} /> Refresh
                        </button>
                        <button className="btn btn-danger" onClick={() => setConfirm({ type: 'purge' })} disabled={busy || isEmpty}>
                            <Eraser size={15} /> Clean All Deleted Data
                        </button>
                    </div>
                </div>

                {isEmpty ? <EmptyState text="No draft or deleted data. Everything is clean." /> : (
                    <div className="admin-sub-chips">
                        <StatChip value={totals.draftCourses} label="draft courses" tone="orange" />
                        <StatChip value={totals.orphanEnrollments} label="orphan enrollments" tone="orange" />
                        <StatChip value={orphanContent.progress || 0} label="orphan progress" tone="orange" />
                        <StatChip value={orphanContent.lessons || 0} label="orphan lectures" tone="orange" />
                        <StatChip value={orphanContent.modules || 0} label="orphan modules" tone="orange" />
                        <StatChip value={orphanContent.chapters || 0} label="orphan chapters" tone="orange" />
                        <StatChip value={orphanContent.quizzes || 0} label="orphan quizzes" tone="orange" />
                    </div>
                )}
            </section>

            {draftCourses.length > 0 && (
                <section className="dashboard-card admin-card">
                    <div className="admin-card-heading">
                        <div>
                            <h2 className="card-title">Draft Courses</h2>
                            <p className="card-text">These courses are not published, so they stay hidden from students and all reports.</p>
                        </div>
                        <AlertTriangle size={22} color="#c2410c" />
                    </div>
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr><th>Course</th><th>Category</th><th>Teacher</th><th>Created</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {draftCourses.map(course => (
                                    <tr key={course._id}>
                                        <td><strong>{course.title}</strong></td>
                                        <td>{course.category || '—'}</td>
                                        <td>{course.teacher}</td>
                                        <td>{formatDate(course.createdAt)}</td>
                                        <td>
                                            <button className="table-action deactivate" onClick={() => setConfirm({ type: 'draft', course })} disabled={busy}>
                                                <Trash2 size={15} /> Delete Permanently
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {orphanEnrollments.length > 0 && (
                <section className="dashboard-card admin-card">
                    <div className="admin-card-heading">
                        <div>
                            <h2 className="card-title">Enrollments of Deleted Users or Courses</h2>
                            <p className="card-text">These enrollment records point to students or courses that no longer exist.</p>
                        </div>
                        <Trash2 size={22} color="#dc2626" />
                    </div>
                    <ul className="admin-mini-list">
                        {orphanEnrollments.map(item => (
                            <li key={item._id}>
                                <span>{item.reason}</span>
                                <small>{formatDate(item.enrolledAt)}</small>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {confirm && (
                <div className="admin-modal-backdrop" onClick={() => !busy && setConfirm(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <button className="admin-modal-close" onClick={() => !busy && setConfirm(null)} aria-label="Close dialog"><X size={18} /></button>
                        <h3>{confirm.type === 'purge' ? 'Delete all deleted data?' : 'Delete draft course?'}</h3>
                        <p>
                            {confirm.type === 'purge'
                                ? `This will permanently remove ${totals.orphanEnrollments} enrollments, ${orphanContent.progress || 0} progress records and ${orphanContent.lessons || 0} lectures that belong to deleted students or courses. This cannot be undone.`
                                : `"${confirm.course.title}" and all of its modules, chapters, lectures, enrollments and progress will be permanently deleted. This cannot be undone.`}
                        </p>
                        <div className="admin-modal-actions">
                            <button className="btn btn-outline" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
                            <button className="btn btn-danger" onClick={confirm.type === 'purge' ? purge : () => deleteDraft(confirm.course)} disabled={busy}>
                                <Trash2 size={15} /> {busy ? 'Deleting...' : 'Yes, Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CleanupTab;

