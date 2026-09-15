import Header from '../components/Header.jsx';

// 🚀 Student Layout (Requirement: layouts/StudentLayout)
const StudentLayout = ({ children }) => {
    return (
        <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header subtitle="Student" />
            <div style={{ flex: 1 }}>
                {children}
            </div>
        </div>
    );
};

export default StudentLayout;