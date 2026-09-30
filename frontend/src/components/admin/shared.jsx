// Shared helpers for the admin control center tabs
import { BarChart3 } from 'lucide-react';

export const formatDate = value => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = value => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const money = value => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const relativeTime = value => {
    if (!value) return 'No activity yet';
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    return formatDate(value);
};

// Progress bar (0-100)
export const ProgressBar = ({ value = 0, tone = 'blue' }) => (
    <div className="admin-progress">
        <span className={`admin-progress-fill ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
);

// Compact stat chip
export const StatChip = ({ icon: Icon, label, value, tone = 'blue' }) => (
    <span className={`admin-chip ${tone}`}>
        {Icon && <Icon size={14} />}
        <span className="admin-chip-value">{value}</span>
        <span className="admin-chip-label">{label}</span>
    </span>
);

// Reusable stat cards row
export const StatGrid = ({ items }) => (
    <section className="admin-stats">
        {items.map(([label, value, Icon, color, hint]) => (
            <div className="stat-box admin-stat" key={label}>
                <span className="admin-stat-icon" style={{ color, background: `${color}14` }}>
                    <Icon size={20} />
                </span>
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
                {hint && <small className="admin-stat-hint">{hint}</small>}
            </div>
        ))}
    </section>
);

// Empty state
export const EmptyState = ({ text }) => <p className="admin-empty">{text}</p>;

// Search + optional extra filter controls
export const AdminToolbar = ({ search, onSearch, placeholder, children }) => (
    <div className="admin-toolbar">
        <div className="admin-search">
            <BarChart3 size={16} />
            <input value={search} onChange={e => onSearch(e.target.value)} placeholder={placeholder} />
        </div>
        {children}
    </div>
);
