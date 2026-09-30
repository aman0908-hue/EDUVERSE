import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import { UserContext } from '../context/UserContext.jsx';
import ScheduleEditor from '../components/ScheduleEditor.jsx';
import { GRADE_OPTIONS, COURSE_LANGUAGES, CATEGORIES } from '../components/timetableLogic.js';

const CreateCourse = () => {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        grade: '10',
        courseLanguage: '',
        language: 'English',
        level: 'Beginner',
        price: '',
        requirements: '',
        learningOutcomes: ''
    });

    // 📅 Class schedule — array of slots, ise JSON string ke roop me bhejenge
    const [schedule, setSchedule] = useState([]);
    const [scheduleNote, setScheduleNote] = useState('');

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
            // Schedule array ko JSON string bana kar bhejte hain
            dataToSend.append('schedule', JSON.stringify(schedule));
            dataToSend.append('scheduleNote', scheduleNote);
            if (thumbnail) dataToSend.append('thumbnail', thumbnail);
            if (trailerVideo) dataToSend.append('trailerVideo', trailerVideo);

            const loadingToast = toast.loading('Creating course...');
            await api.post('/courses/create', dataToSend);
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
                            <select name="category" value={formData.category} required onChange={handleChange} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                <option value="">Select Category</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            {/* 🎓 Course kis class ke liye hai — students filter yahi se karte hain */}
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>For which class?</label>
                            <select name="grade" value={formData.grade} onChange={handleChange} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g === 'All' ? 'All classes' : g === 'UG' ? 'UG (College)' : `Class ${g}`}</option>)}
                            </select>
                            <small className="form-hint">Only students of this class will see this course.</small>
                        </div>
                        {/* 🌍 Language category chunne par language ka dropdown aata hai */}
                        {formData.category === 'Language' && (
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Which language?</label>
                                <select
                                    name="courseLanguage"
                                    value={formData.courseLanguage}
                                    onChange={handleChange}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="">Select Language</option>
                                    {COURSE_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                                <small className="form-hint">This course teaches the language you pick here.</small>
                            </div>
                        )}

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

                    {/* 📅 Class schedule — AI "kab hai class" ka jawab yahin se deta hai */}
                    <div className="form-group">
                        <ScheduleEditor
                            value={schedule}
                            onChange={setSchedule}
                            note={scheduleNote}
                            onNoteChange={setScheduleNote}
                        />
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