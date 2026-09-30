import { useEffect, useState } from 'react';
import { Search, UserCheck, UserPlus, UserX } from 'lucide-react';
import api from '../../utils/api.js';
import toast from 'react-hot-toast';
import { formatDate, EmptyState } from './shared.jsx';

// Users tab — role/access management, teacher approval requests aur teacher create
const UsersTab = () => {
    const [users, setUsers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('');
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [saving, setSaving] = useState(false);

    const loadRequests = async () => {
        try {
            const res = await api.get('/admin/teacher-requests', { params: { status: 'pending' } });
            setRequests(res.data.requests || []);
        } catch { setRequests([]); }
    };

    const load = async () => {
        try {
            setLoading(true);
            const userList = await api.get('/admin/users', { params: { search, role } });
            setUsers(userList.data.users || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Users could not be loaded.');
        } finally { setLoading(false); }
    };

    useEffect(() => { loadRequests(); }, []);

    useEffect(() => {
        const timer = setTimeout(load, 250);
        return () => clearTimeout(timer);
    }, [search, role]);

    const review = async (requestId, action) => {
        try {
            const res = await api.patch(`/admin/teacher-requests/${requestId}`, { action });
            toast.success(res.data.message);
            await Promise.all([loadRequests(), load()]);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Request could not be updated.');
        }
    };

    const createTeacher = async event => {
        event.preventDefault();
        setSaving(true);
        try {
            const response = await api.post('/admin/teachers', form);
            toast.success(response.data.message);
            setForm({ name: '', email: '', password: '' });
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Teacher could not be created.');
        } finally { setSaving(false); }
    };

    const toggleUser = async user => {
        try {
            await api.patch(`/admin/users/${user._id}/access`, { isActive: !user.isActive });
            toast.success(user.isActive ? 'User deactivated.' : 'User activated.');
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Access could not be updated.');
        }
    };

    const changeRole = async (user, nextRole) => {
        try {
            await api.patch(`/admin/users/${user._id}/role`, { role: nextRole });
            toast.success(`${user.name} is now a ${nextRole}.`);
            await load();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Role could not be updated.');
        }
    };

    return (
        <>
            <div className="admin-columns">
                <section className="dashboard-card admin-card">
                    <div className="admin-card-heading">
                        <div>
                            <h2 className="card-title">Teacher Requests {requests.length > 0 && <span className="pending-count">{requests.length}</span>}</h2>
                            <p className="card-text">A user becomes a teacher only after you approve the request.</p>
                        </div>
                        <UserCheck size={22} color="#ea580c" />
                    </div>
                    {requests.length === 0 ? <EmptyState text="No pending requests." /> : (
                        <div className="request-list">
                            {requests.map(r => (
                                <div className="request-item" key={r._id}>
                                    <div className="request-info">
                                        <strong>{r.name}</strong>
                                        <small>{r.email}</small>
                                        {r.qualification && <small>Qualification: {r.qualification}</small>}
                                        {r.subject && <small>Subject: {r.subject}</small>}
                                        {r.reason && <small>Reason: {r.reason}</small>}
                                    </div>
                                    <div className="request-actions">
                                        <button className="approve" onClick={() => review(r._id, 'approve')}>Approve</button>
                                        <button className="reject" onClick={() => review(r._id, 'reject')}>Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="dashboard-card admin-card">
                    <div className="admin-card-heading">
                        <div>
                            <h2 className="card-title">Create Teacher Account</h2>
                            <p className="card-text">Directly create a teacher (no approval needed).</p>
                        </div>
                        <UserPlus size={22} color="#2563eb" />
                    </div>
                    <form onSubmit={createTeacher} className="admin-form">
                        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="form-control" />
                        <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Teacher email" className="form-control" />
                        <input required minLength={8} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Temporary password" className="form-control" />
                        <button disabled={saving} className="btn btn-primary">{saving ? 'Creating...' : 'Create Teacher'}</button>
                    </form>
                </section>
            </div>

            <section className="dashboard-card admin-card admin-users-card">
                <div className="admin-card-heading">
                    <div>
                        <h2 className="card-title">User Management</h2>
                        <p className="card-text">Activate, deactivate or update roles. Passwords are hidden.</p>
                    </div>
                    <div className="admin-search">
                        <Search size={16} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email" />
                    </div>
                </div>
                <div className="admin-filters">
                    <button className={!role ? 'active' : ''} onClick={() => setRole('')}>All</button>
                    <button className={role === 'student' ? 'active' : ''} onClick={() => setRole('student')}>Students</button>
                    <button className={role === 'teacher' ? 'active' : ''} onClick={() => setRole('teacher')}>Teachers</button>
                    <button className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>Admins</button>
                </div>
                {loading ? <EmptyState text="Loading users..." /> : users.length === 0 ? <EmptyState text="No users found." /> : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user._id}>
                                        <td><strong>{user.name}</strong><small>{user.email}</small></td>
                                        <td>
                                            <select value={user.role} disabled={user.role === 'admin'} onChange={e => changeRole(user, e.target.value)}>
                                                <option value="student">Student</option>
                                                <option value="teacher">Teacher</option>
                                                {user.role === 'admin' && <option value="admin">Admin</option>}
                                            </select>
                                        </td>
                                        <td><span className={`status-pill ${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                                        <td>{formatDate(user.createdAt)}</td>
                                        <td>
                                            <button className={`table-action ${user.isActive ? 'deactivate' : 'activate'}`} disabled={user.role === 'admin'} onClick={() => toggleUser(user)}>
                                                {user.isActive ? <><UserX size={15} /> Deactivate</> : <><UserCheck size={15} /> Activate</>}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
};

export default UsersTab;

