import Header from '../components/Header.jsx';

// 🚀 Teacher Layout (Requirement: layouts/TeacherLayout)
const TeacherLayout = ({ children }) => {
    return (
        <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header subtitle="Instructor" />
            <div style={{ flex: 1 }}>
                {children}
            </div>
        </div>
    );
};

export default TeacherLayout;