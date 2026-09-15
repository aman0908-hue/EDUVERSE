import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { UserContext } from './context/UserContext.jsx';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateCourse from './pages/CreateCourse'; 
import EditCourse from './pages/EditCourse'; 
import LearningPage from './pages/LearningPage';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import StudentLayout from './layouts/StudentLayout.jsx';
import TeacherLayout from './layouts/TeacherLayout.jsx';

// 🚀 Route Guard: login + role check (Authentication & authorization security)
// /auth/me se session restore hone tak wait karta hai (UserContext.sessionChecked)
const RequireRole = ({ role, children }) => {
    const { user, sessionChecked } = useContext(UserContext);

    // Session restore chal raha hai — abhi kuch mat dikhao
    if (!sessionChecked) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Checking your session...
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;

    // Galat role wale ko apne dashboard par bhej do
    if (role && user.role !== role) {
        return <Navigate to={user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'} replace />;
    }

    return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* 🚀 Login/Register: consistent Header + agar pehle se logged-in hai toh dashboard par bhejo */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} /> 

        {/* 🚀 Browse courses (public — browsing bina login ke allowed hai) */}
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />

        {/* 🚀 Student pages: StudentLayout + role guard (bina login / galat role → redirect) */}
        <Route path="/student-dashboard" element={
          <RequireRole role="student">
            <StudentLayout><StudentDashboard /></StudentLayout>
          </RequireRole>
        } />

        {/* 🚀 Teacher pages: TeacherLayout + role guard */}
        <Route path="/teacher-dashboard" element={
          <RequireRole role="teacher">
            <TeacherLayout><TeacherDashboard /></TeacherLayout>
          </RequireRole>
        } />
        <Route path="/create-course" element={
          <RequireRole role="teacher">
            <TeacherLayout><CreateCourse /></TeacherLayout>
          </RequireRole>
        } />
        <Route path="/edit-course/:id" element={
          <RequireRole role="teacher">
            <TeacherLayout><EditCourse /></TeacherLayout>
          </RequireRole>
        } />

        {/* 🚀 Learning page: login zaroori hai (content backend par enrollment-protected hai) */}
        <Route path="/learn/:courseId" element={
          <RequireRole>
            <LearningPage />
          </RequireRole>
        } />
      </Routes>
    </Router>
  );
}

export default App;