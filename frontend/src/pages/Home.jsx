import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from '../context/UserContext.jsx';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const Home = () => {
    const { user } = useContext(UserContext);

    return (
        <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            <div className="home-container" style={{ flex: 1 }}>
                <h1 className="home-title">
                    Welcome to <span className="highlight">EduVerse</span>
                </h1>
                
                <p className="subtitle home-subtitle">
                    The ultimate Learning Management System. Connect, learn, and grow with our modern platform designed for both students and teachers.
                </p>
                
                <div className="btn-group">
                    {/* 🚀 Role-aware CTAs: logged-in user ko uska dashboard dikhao */}
                    {user ? (
                        <>
                            <Link 
                                to={user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'} 
                                className="btn btn-primary home-btn">
                                Go to Dashboard →
                            </Link>
                            <Link to="/courses" className="btn btn-outline home-btn">
                                Browse Courses
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/courses" className="btn btn-primary home-btn">
                                Browse Courses
                            </Link>
                            <Link to="/register" className="btn btn-outline home-btn">
                                Get Started
                            </Link>
                            <Link to="/login" className="btn btn-outline home-btn">
                                Login to Account
                            </Link>
                        </>
                    )}
                </div>

                {/* 🚀 Feature highlights */}
                <div className="dashboard-grid" style={{ maxWidth: '900px', margin: '60px auto 0', width: '100%' }}>
                    <div className="dashboard-card">
                        <h3 className="card-title">👨‍🏫 For Teachers</h3>
                        <p className="card-text">Create structured courses with modules, chapters, video lectures, study materials & quizzes.</p>
                    </div>
                    <div className="dashboard-card">
                        <h3 className="card-title">🎓 For Students</h3>
                        <p className="card-text">Enroll in courses, watch chunked-streaming lectures, attempt quizzes & track progress.</p>
                    </div>
                    <div className="dashboard-card">
                        <h3 className="card-title">📊 Dashboards</h3>
                        <p className="card-text">Role-based dashboards with live progress %, quiz scores and student analytics.</p>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default Home;