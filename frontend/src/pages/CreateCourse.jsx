import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import { UserContext } from '../context/UserContext.jsx';

const CreateCourse = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        language: 'English',
        level: 'Beginner',
        price: '',
        requirements: '',
        learningOutcomes: ''
    });

    // 🚀 NAYA: Thumbnail + Trailer video uploads (Requirement 3.2)
    const [thumbnail, setThumbnail] = useState(null);
    const [trailerVideo, setTrailerVideo] = useState(null);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user?._id) {
            toast.error('Please login as a teacher first!');
            return navigate('/login');
        }

        try {
            // 🚀 FormData: files + text fields dono ek sath jaayenge
            const dataToSend = new FormData();
            Object.keys(formData).forEach(key => dataToSend.append(key, formData[key]));
            dataToSend.append('instructor', user._id);
            if (thumbnail) dataToSend.append('thumbnail', thumbnail);
            if (trailerVideo) dataToSend.append('trailerVideo', trailerVideo);

            const loadingToast = toast.loading('Creating course...');
            await api.post('/courses/create', dataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.dismiss(loadingToast);
            
            toast.success("Course created successfully! 🎉");
            navigate('/teacher-dashboard'); 
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create course');
        }
    };

    return (
        <div className="page-wrapper" style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', padding: '40px 20px' }}>
            <div className="auth-card" style={{ maxWidth: '700px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 className="main-title" style={{ color: '#1f2937', marginBottom: '10px' }}>Create New Course</h2>
                <p className="subtitle" style={{ color: '#6b7280', marginBottom: '30px' }}>Fill in the details below to add a new course to your catalog.</p>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                        <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Course Title</label>
                        <input type="text" name="title" placeholder="e.g. Advanced Java Programming" required onChange={handleChange} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                    </div>

                    <div className="form-group">
                        <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Description</label>
                        <textarea name="description" placeholder="What will students learn in this course?" required onChange={handleChange} className="form-control" rows="4" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'none' }}></textarea>
                    </div>

                    {/* 🚀 3 Naye Dropdowns ek sath */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Category</label>
                            <select name="category" required onChange={handleChange} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                <option value="">Select Category</option>
                                <option value="Programming">Programming</option>
                                <option value="Design">Design</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Business">Business</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Language</label>
                            <select name="language" required onChange={handleChange} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                <option value="">Select Language</option>
                                <option value="Hindi">Hindi</option>
                                <option value="English">English</option>
                                <option value="Hinglish">Hinglish</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Level</label>
                            <select name="level" required onChange={handleChange} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                <option value="">Select Level</option>
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Price (in ₹)</label>
                        <input type="number" name="price" placeholder="e.g. 499 (Enter 0 for Free Course)" required onChange={handleChange} className="form-control" min="0" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                    </div>

                    {/* 🚀 NAYA: Requirements + Learning Outcomes (Requirement 3.2) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Requirements (one per line)</label>
                            <textarea name="requirements" placeholder={'e.g.\nBasic programming knowledge\nA computer with internet'} onChange={handleChange} className="form-control" rows="3" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'none' }}></textarea>
                        </div>
                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Learning Outcomes (one per line)</label>
                            <textarea name="learningOutcomes" placeholder={'e.g.\nBuild full-stack apps\nMaster React fundamentals'} onChange={handleChange} className="form-control" rows="3" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'none' }}></textarea>
                        </div>
                    </div>

                    {/* 🚀 NAYA: Thumbnail + Trailer uploads */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Course Thumbnail (image)</label>
                            <input type="file" accept="image/*" onChange={(e) => setThumbnail(e.target.files[0])} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                        </div>
                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Trailer Video (optional)</label>
                            <input type="file" accept="video/*" onChange={(e) => setTrailerVideo(e.target.files[0])} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                        <button type="button" onClick={() => navigate('/teacher-dashboard')} className="btn btn-outline" style={{ flex: 1, padding: '12px', border: '1px solid #6b7280', color: '#374151', borderRadius: '6px', backgroundColor: 'transparent', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Publish Course</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCourse;