import { Link } from 'react-router-dom';

// 🚀 Reusable Course Card (Requirement: components/CourseCard)
// Home, Courses aur Dashboard — jagah jagah use hoga
const CourseCard = ({ course, children }) => {
    const thumbnailUrl = course.thumbnail
        ? `${import.meta.env.VITE_API_URL}/uploads/${course.thumbnail}`
        : null;

    return (
        <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
            {/* Thumbnail / Placeholder */}
            <div style={{
                height: '140px',
                backgroundColor: '#eef2ff',
                backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {!thumbnailUrl && (
                    <span style={{ color: 'white', fontSize: '2.2rem', fontWeight: 'bold', opacity: 0.9 }}>
                        {course.title?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                )}
            </div>

            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{course.category || 'General'}</span>
                    <span className="badge badge-purple">{course.level || 'Beginner'}</span>
                    {course.language && <span className="badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>🌐 {course.language}</span>}
                </div>

                <h3 className="card-title" style={{ marginTop: '12px', fontSize: '1.2rem' }}>{course.title}</h3>
                <p className="card-text" style={{ marginBottom: '10px', height: '40px', overflow: 'hidden' }}>{course.description}</p>

                {/* Instructor + Price */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span>👨‍🏫 {course.instructor?.name || 'Instructor'}</span>
                    {course.price === 0 || !course.price ? (
                        <span className="badge badge-green" style={{ background: '#dcfce7', color: '#166534' }}>Free</span>
                    ) : (
                        <span style={{ fontWeight: 'bold', color: '#854d0e' }}>₹{course.price}</span>
                    )}
                </div>

                <div className="card-action" style={{ marginTop: 'auto' }}>
                    {children || (
                        <Link to={`/courses/${course._id}`} className="btn btn-primary" style={{ width: '100%', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                            View Details
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CourseCard;