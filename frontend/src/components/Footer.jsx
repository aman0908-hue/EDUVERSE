import { Link } from 'react-router-dom';

// 🚀 Reusable Footer component (Requirement: components/Footer)
const Footer = () => {
    return (
        <footer style={{
            backgroundColor: '#111827',
            color: '#9ca3af',
            padding: '40px 20px',
            marginTop: 'auto'
        }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '25px' }}>
                <div>
                    <h3 style={{ color: 'white', margin: '0 0 8px 0' }}>EduVerse <span style={{ color: '#6366f1' }}>LMS</span></h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '320px' }}>
                        The AI-Powered Learning Management System connecting Teachers and Students worldwide.
                    </p>
                </div>
                <div>
                    <h4 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '0.95rem' }}>Quick Links</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                        <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none' }}>Home</Link>
                        <Link to="/courses" style={{ color: '#9ca3af', textDecoration: 'none' }}>Browse Courses</Link>
                        <Link to="/register" style={{ color: '#9ca3af', textDecoration: 'none' }}>Become a Teacher</Link>
                    </div>
                </div>
            </div>
            <div style={{ maxWidth: '1100px', margin: '25px auto 0', borderTop: '1px solid #374151', paddingTop: '20px', textAlign: 'center', fontSize: '0.85rem' }}>
                © {new Date().getFullYear()} EduVerse. Built with the MERN stack.
            </div>
        </footer>
    );
};

export default Footer;