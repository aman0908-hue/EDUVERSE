import { useState } from 'react';
import { BookOpen, GraduationCap, LayoutDashboard, ShieldCheck, Sparkles, Trash2, UserCheck, Users } from 'lucide-react';
import Header from '../components/Header.jsx';
import OverviewTab from '../components/admin/OverviewTab.jsx';
import TeachersTab from '../components/admin/TeachersTab.jsx';
import StudentsTab from '../components/admin/StudentsTab.jsx';
import CoursesTab from '../components/admin/CoursesTab.jsx';
import EnrollmentsTab from '../components/admin/EnrollmentsTab.jsx';
import UsersTab from '../components/admin/UsersTab.jsx';
import CleanupTab from '../components/admin/CleanupTab.jsx';
import AiSettingsTab from '../components/admin/AiSettingsTab.jsx';

// Admin control center — har tab platform ka alag hissa detail me dikhata hai
const TABS = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'teachers', label: 'Teachers', icon: UserCheck },
    { key: 'students', label: 'Students', icon: GraduationCap },
    { key: 'courses', label: 'Courses', icon: BookOpen },
    { key: 'enrollments', label: 'Enrollments', icon: Users },
    { key: 'users', label: 'Users & Access', icon: ShieldCheck },
    { key: 'cleanup', label: 'Drafts & Cleanup', icon: Trash2 },
    { key: 'ai', label: 'AI Settings', icon: Sparkles }
];

const AdminDashboard = () => {
    const [tab, setTab] = useState('overview');

    return (
        <div className="admin-page">
            <Header subtitle="Admin Console" />
            <main className="dashboard-wrapper admin-wrapper">
                <div className="admin-hero">
                    <div>
                        <span className="admin-kicker"><ShieldCheck size={16} /> Secure control center</span>
                        <h1 className="dashboard-title">Admin Dashboard</h1>
                        <p>Complete platform data — teachers, students, courses, enrollments and activity.</p>
                    </div>
                    <div className="admin-security">
                        <ShieldCheck size={20} />
                        <strong>Role-protected</strong>
                        <span>MongoDB-backed access control</span>
                    </div>
                </div>

                <nav className="admin-tabs">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
                            <Icon size={16} /> {label}
                        </button>
                    ))}
                </nav>

                {tab === 'overview' && <OverviewTab />}
                {tab === 'teachers' && <TeachersTab />}
                {tab === 'students' && <StudentsTab />}
                {tab === 'courses' && <CoursesTab />}
                {tab === 'enrollments' && <EnrollmentsTab />}
                {tab === 'users' && <UsersTab />}
                {tab === 'cleanup' && <CleanupTab />}
                {tab === 'ai' && <AiSettingsTab />}
            </main>
        </div>
    );
};

export default AdminDashboard;
