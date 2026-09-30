import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { assetUrl } from '../utils/api.js';
import QuizBuilder, { AIQuizGenerator } from '../components/QuizBuilder.jsx';
import ScheduleEditor from '../components/ScheduleEditor.jsx';
import ChapterPdfManager from '../components/ChapterPdfManager.jsx';
import LessonEditor from '../components/LessonEditor.jsx';
import ClassTimetable from '../components/ClassTimetable.jsx';
import { GRADE_OPTIONS, COURSE_LANGUAGES, CATEGORIES } from '../components/timetableLogic.js';

const EditCourse = () => {
    const { id } = useParams();
    
    // --- MODULES & CHAPTERS STATE ---
    const [modules, setModules] = useState([]);
    const [newModuleTitle, setNewModuleTitle] = useState("");
    const [chapters, setChapters] = useState({});
    const [chapterInputs, setChapterInputs] = useState({}); 

    // --- LESSON STATE ---
    const [lessons, setLessons] = useState([]);
    const [showLessonForm, setShowLessonForm] = useState(null); 

    // 🎯 Simple UI: Quick Add form is hidden by default — only a single button is shown
    const [quickAddOpen, setQuickAddOpen] = useState(false);

    const [viewMode, setViewMode] = useState('content'); 
    const [analytics, setAnalytics] = useState([]); 

    const [formData, setFormData] = useState({ title: '', videoUrl: '', theoryContent: '', topic: '', liveLink: '', liveTime: '' });
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [videoFile, setVideoFile] = useState(null); 

    const [activeQuizLesson, setActiveQuizLesson] = useState(null); 
    const [lessonQuizzes, setLessonQuizzes] = useState({}); 

    // 🏆 Questions for the final course quiz (the AI generator appends them here)
    const [courseQuizzes, setCourseQuizzes] = useState([]);

    // ✏️ Which lesson is currently being edited (null = none)
    const [editingLessonId, setEditingLessonId] = useState(null);

    // 🚀 NEW: Course metadata editing (PUT /courses/update)
    const [courseMeta, setCourseMeta] = useState(null);

    // 📅 Class schedule (day + time) — the AI answers "when is class?" from this
    const [schedule, setSchedule] = useState([]);
    const [scheduleNote, setScheduleNote] = useState('');
    const [metaThumbnail, setMetaThumbnail] = useState(null);
    const [metaTrailer, setMetaTrailer] = useState(null);

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                // 🚀 NEW: Also fetch the course metadata (needed for Edit Details)
                const courseRes = await api.get(`/courses/${id}`);
                const c = courseRes.data.course;
                setCourseMeta({
                    title: c.title || '',
                    description: c.description || '',
                    category: c.category || '',
                    grade: c.grade || 'All',
                    courseLanguage: c.courseLanguage || '',
                    language: c.language || 'English',
                    level: c.level || 'Beginner',
                    price: c.price || 0,
                    requirements: (c.requirements || []).join('\n'),
                    learningOutcomes: (c.learningOutcomes || []).join('\n')
                });
                setSchedule(c.schedule || []);
                setScheduleNote(c.scheduleNote || '');

                const lessonRes = await api.get(`/lessons/${id}`);
                setLessons(lessonRes.data.lessons);

                const moduleRes = await api.get(`/modules/${id}`);
                const fetchedModules = moduleRes.data.modules || [];
                setModules(fetchedModules);

                fetchedModules.forEach(async (mod) => {
                    try {
                        const chapRes = await api.get(`/chapters/${mod._id}`);
                        setChapters(prev => ({ ...prev, [mod._id]: chapRes.data.chapters || [] }));
                    } catch (err) { console.log("Chapters failed to load for module", mod._id); }
                });
            } catch (error) { toast.error("Failed to load course data"); }
        };
        fetchCourseData();
    }, [id]);

    // 🚀 NEW: Update the course metadata
    const handleCourseMetaChange = (e) => setCourseMeta({ ...courseMeta, [e.target.name]: e.target.value });

    const handleCourseMetaSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = new FormData();
            Object.keys(courseMeta).forEach(key => dataToSend.append(key, courseMeta[key]));
            dataToSend.append('courseId', id);
            // Convert the schedule array to a JSON string before sending
            dataToSend.append('schedule', JSON.stringify(schedule));
            dataToSend.append('scheduleNote', scheduleNote);
            if (metaThumbnail) dataToSend.append('thumbnail', metaThumbnail);
            if (metaTrailer) dataToSend.append('trailerVideo', metaTrailer);

            const res = await api.put('/courses/update', dataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success(res.data.message || 'Course details updated!');
            setMetaThumbnail(null);
            setMetaTrailer(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update course');
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await api.get(`/progress/analytics/${id}`);
            setAnalytics(res.data.analytics || []);
            setViewMode('analytics');
        } catch (error) { toast.error("Failed to load analytics"); }
    };

    const handleAddModule = async () => {
        if (!newModuleTitle) return toast.error("Please enter a module title!");
        try {
            const res = await api.post('/modules', { title: newModuleTitle, courseId: id, order: modules.length + 1 });
            if (res.data.success) {
                toast.success("Module added successfully!");
                setModules([...modules, res.data.module]);
                setNewModuleTitle(""); 
            }
        } catch (error) { toast.error("Failed to add module"); }
    };

    const handleAddChapter = async (moduleId) => {
        const chapterTitle = chapterInputs[moduleId];
        if (!chapterTitle) return toast.error("Please enter a chapter title!");
        try {
            const res = await api.post('/chapters', { title: chapterTitle, moduleId: moduleId, courseId: id, order: (chapters[moduleId] || []).length + 1 });
            if (res.data.success) {
                toast.success("Chapter added!");
                setChapters(prev => ({ ...prev, [moduleId]: [...(prev[moduleId] || []), res.data.chapter] }));
                setChapterInputs(prev => ({ ...prev, [moduleId]: "" }));
            }
        } catch (error) { toast.error("Failed to add chapter"); }
    };

    // 🚀 NEW: Quick Add Lesson state (lets you add video/notes/PDF even without a chapter)
    const [quickData, setQuickData] = useState({ title: '', videoUrl: '', theoryContent: '', topic: '', liveLink: '', liveTime: '' });
    const [quickVideo, setQuickVideo] = useState(null);
    const [quickPdf, setQuickPdf] = useState(null);
    const [quickChapter, setQuickChapter] = useState('');
    const [quickFileKey, setQuickFileKey] = useState(0);

    // 🚀 NEW: Quick Add — video file / YouTube link / notes / PDF all in one place
    const handleQuickAdd = async (e) => {
        e.preventDefault();
        if (!quickData.title || !quickData.title.trim()) {
            return toast.error('Please enter a lesson title!');
        }
        if (!quickVideo && !quickData.videoUrl && !quickData.theoryContent && !quickPdf) {
            return toast.error('Add at least one: video file, YouTube link, notes or PDF!');
        }
        try {
            const dataToSend = new FormData();
            dataToSend.append('title', quickData.title);
            dataToSend.append('videoUrl', quickData.videoUrl);
            dataToSend.append('theoryContent', quickData.theoryContent);
            // 📺 Topic — what this lesson covers; the quiz is generated from it
            dataToSend.append('topic', quickData.topic || '');
            // 🔴 Live class link + time (Google Meet / Zoom)
            dataToSend.append('liveLink', quickData.liveLink || '');
            dataToSend.append('liveTime', quickData.liveTime || '');
            dataToSend.append('courseId', id);
            if (quickChapter) dataToSend.append('chapterId', quickChapter);
            dataToSend.append('order', lessons.length + 1);
            if (quickPdf) dataToSend.append('attachmentFile', quickPdf);
            if (quickVideo) dataToSend.append('videoFile', quickVideo);

            const loadingToast = toast.loading('Uploading lesson & files...');
            const response = await api.post('/lessons/add', dataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.dismiss(loadingToast);
            toast.success('Lesson added successfully! 🎉');
            setLessons([...lessons, response.data.lesson]);

            // Reset the form + file inputs (the key trick resets the file inputs)
            setQuickData({ title: '', videoUrl: '', theoryContent: '', topic: '', liveLink: '', liveTime: '' });
            setQuickVideo(null); setQuickPdf(null); setQuickChapter('');
            setQuickFileKey(k => k + 1);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add lesson');
        }
    };

    // Flat list of all chapters (for the Quick Add dropdown)
    const allChaptersFlat = Object.entries(chapters).flatMap(([moduleId, chaps]) =>
        (chaps || []).map(chap => ({ ...chap, moduleTitle: modules.find(m => m._id === moduleId)?.title || '' }))
    );

    const handleLessonChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleLessonSubmit = async (e, chapterId) => {
        e.preventDefault();
        try {
            const dataToSend = new FormData();
            dataToSend.append('title', formData.title);
            dataToSend.append('videoUrl', formData.videoUrl);
            dataToSend.append('theoryContent', formData.theoryContent);
            dataToSend.append('topic', formData.topic || '');
            dataToSend.append('liveLink', formData.liveLink || '');
            dataToSend.append('liveTime', formData.liveTime || '');
            dataToSend.append('courseId', id);
            dataToSend.append('chapterId', chapterId); 
            dataToSend.append('order', lessons.length + 1);
            if (attachmentFile) dataToSend.append('attachmentFile', attachmentFile);
            if (videoFile) dataToSend.append('videoFile', videoFile); 

            const loadingToast = toast.loading("Uploading lesson & files...");
            const response = await api.post('/lessons/add', dataToSend, { headers: { 'Content-Type': 'multipart/form-data' } });
            
            toast.dismiss(loadingToast);
            toast.success("Lesson added successfully!");
            setLessons([...lessons, response.data.lesson]);
            
            setFormData({ title: '', videoUrl: '', theoryContent: '', topic: '', liveLink: '', liveTime: '' });
            setAttachmentFile(null); setVideoFile(null);
            setShowLessonForm(null); 
            if(document.getElementById('fileInput')) document.getElementById('fileInput').value = ''; 
            if(document.getElementById('videoInput')) document.getElementById('videoInput').value = ''; 
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add lesson');
        }
    };

    // ✏️ Reflect the edit in the list immediately
    const handleLessonUpdated = (updated) => {
        if (!updated || !updated._id) return;
        setLessons(prev => prev.map(l => (l._id === updated._id ? { ...l, ...updated } : l)));
        setEditingLessonId(null);
    };

    // 🗑️ Remove the lesson from the list + quiz state when it is deleted
    const handleLessonDeleted = (lessonId) => {
        setLessons(prev => prev.filter(l => l._id !== lessonId));
        setLessonQuizzes(prev => {
            const next = { ...prev };
            delete next[lessonId];
            return next;
        });
        if (activeQuizLesson === lessonId) setActiveQuizLesson(null);
        if (editingLessonId === lessonId) setEditingLessonId(null);
    };

    const toggleQuizPanel = async (lessonId) => {
        if (activeQuizLesson === lessonId) setActiveQuizLesson(null); 
        else {
            setActiveQuizLesson(lessonId); 
            try {
                const res = await api.get(`/quizzes/lesson/${lessonId}`);
                setLessonQuizzes(prev => ({ ...prev, [lessonId]: res.data.quizzes }));
            } catch (error) { toast.error("Failed to load quizzes"); }
        }
    };
    // 🚀 NEW: Add extra study material (PDF/notes/image) to a lesson
    const handleAddMaterial = (lessonId) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,image/*,.zip,.doc,.docx,.txt,.md';
        input.onchange = async () => {
            if (!input.files[0]) return;
            const fd = new FormData();
            fd.append('lectureId', lessonId);
            fd.append('materialTitle', input.files[0].name);
            fd.append('materialFile', input.files[0]);
            try {
                const loadingToast = toast.loading('Uploading material...');
                const res = await api.post('/lessons/materials', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.dismiss(loadingToast);
                toast.success('Study material added! 📎');
                setLessons(lessons.map(l => l._id === lessonId ? res.data.lecture : l));
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to add material');
            }
        };
        input.click();
    };

    // 🚀 The QuizBuilder component handles add/delete (components/QuizBuilder.jsx)

    const unassignedLessons = lessons.filter(l => !l.chapterId);

    return (
        <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', padding: '20px' }}>
            <div className="dashboard-wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <Link to="/teacher-dashboard" className="btn btn-outline" style={{ marginBottom: '20px', display: 'inline-block', textDecoration: 'none' }}>
                    ← Back to Dashboard
                </Link>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 className="dashboard-title" style={{ margin: 0 }}>Course Management</h1>
                        <p className="subtitle" style={{ textAlign: 'left', margin: '5px 0 0 0' }}>Manage videos or view student progress.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {/* TABS — each purpose is clearly separated:
                            Content = the learning content (module/chapter/lesson)
                            Timetable = when the class happens (schedule)
                            Details = course info (title, price, description)
                            Analytics = student data */}
                        <button onClick={() => setViewMode('content')} className={`btn ${viewMode === 'content' ? 'btn-primary' : 'btn-outline'}`} title="Modules, chapters and lessons">
                            📚 Content
                        </button>
                        <button onClick={() => setViewMode('timetable')} className={`btn ${viewMode === 'timetable' ? 'btn-primary' : 'btn-outline'}`} style={{ backgroundColor: viewMode === 'timetable' ? '#0ea5e9' : 'transparent', borderColor: '#0ea5e9', color: viewMode === 'timetable' ? 'white' : '#0ea5e9' }} title="When is class — day, time, live link">
                            📅 Class Timetable
                        </button>
                        <button onClick={() => setViewMode('details')} className={`btn ${viewMode === 'details' ? 'btn-primary' : 'btn-outline'}`} style={{ backgroundColor: viewMode === 'details' ? '#4f46e5' : 'transparent', borderColor: '#4f46e5', color: viewMode === 'details' ? 'white' : '#4f46e5' }} title="Title, price, description, thumbnail">
                            ⚙️ Course Info
                        </button>
                        <button onClick={fetchAnalytics} className={`btn ${viewMode === 'analytics' ? 'btn-primary' : 'btn-outline'}`} style={{ backgroundColor: viewMode === 'analytics' ? '#8b5cf6' : 'transparent', borderColor: '#8b5cf6', color: viewMode === 'analytics' ? 'white' : '#8b5cf6' }} title="Students ka progress">
                            📊 Analytics
                        </button>
                    </div>
                </div>

                {viewMode === 'content' && (
                    <>
                        <div className="dashboard-card" style={{ marginBottom: '30px', padding: '25px', borderLeft: '4px solid #10b981' }}>
                            <h3 style={{ marginBottom: '15px' }}>📚 Course Curriculum</h3>
                            
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                                <input type="text" placeholder="Enter new module name (e.g., Module 1: Introduction)" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} className="form-control" style={{ flex: 1 }} />
                                <button onClick={handleAddModule} className="btn btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>+ Add Module</button>
                            </div>

                            {/* 🎯 Simple: the entire lesson form is hidden, just one button */}
                            <div style={{ marginBottom: '20px' }}>
                                <button
                                    onClick={() => setQuickAddOpen(!quickAddOpen)}
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '14px', fontSize: '1rem', backgroundColor: '#4f46e5', borderColor: '#4f46e5' }}
                                >
                                    {quickAddOpen ? '➖ Close Lesson Form' : '➕ Add New Lesson (Video / YouTube / PDF / Notes)'}
                                </button>
                            </div>

                            {/* 🚀 NEW: Quick Add Lesson — video/PDF/YouTube link can always be added from here */}
                            <div className="dashboard-card" style={{ marginBottom: '30px', padding: '20px', border: '2px dashed #4f46e5', backgroundColor: '#eef2ff', display: quickAddOpen ? 'block' : 'none' }}>
                                {/* 🎯 Simple guide: clearly explains what each field is */}
                                <div style={{ background: '#ffffff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.86rem', color: '#374151', lineHeight: '1.6' }}>
                                    <strong style={{ color: '#111827' }}>Just fill in 2 things — everything else is optional:</strong>
                                    <div style={{ marginTop: '8px' }}>
                                        <div>1️⃣ <strong>Title</strong> — enter the lesson title (this one is required).</div>
                                        <div>2️⃣ <strong>Choose just one video</strong> — fill in only <em>one</em> of the two options below:
                                            <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                                                <li><strong>Video File</strong> — upload an MP4 from your computer (it plays in the same tab)</li>
                                                <li><strong>YouTube Link</strong> — paste a YouTube URL (it plays in the same tab)</li>
                                            </ul>
                                        </div>
                                        <div style={{ marginTop: '6px' }}>3️⃣ <strong>Notes / PDF</strong> — this works even if you skip it. Optionally add the lesson text or a PDF.</div>
                                        <div style={{ marginTop: '6px' }}>4️⃣ <strong>Chapter</strong> — if you skip this the lesson goes to &quot;Unassigned&quot;, and you can move it later.</div>
                                        <div style={{ marginTop: '6px' }}>5️⃣ <strong>Topic</strong> — fill this in and you can generate an <strong>AI quiz</strong> for that topic in one click.</div>
                                        <div style={{ marginTop: '6px' }}>6️⃣ <strong>Live Class Link</strong> — add a Google Meet/Zoom link and students get a &quot;Join Live Class&quot; button.</div>
                                    </div>
                                </div>

                                <h3 style={{ marginBottom: '5px', color: '#4f46e5' }}>➕ Quick Add Lesson</h3>
                                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '15px' }}>
                                    Upload a video file, paste a YouTube link, write notes, or attach a PDF — all in one place!
                                </p>
                            {/* 📺 Topic — the quiz is generated from this topic */}
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold' }}>📺 What is the topic?</label>
                                <input
                                    type="text"
                                    name="topic"
                                    value={formData.topic}
                                    onChange={handleLessonChange}
                                    className="form-control"
                                    placeholder="e.g. Newton Second Law — isi topic ka quiz bana sakte ho"
                                />
                            </div>

                            {/* 🔴 LIVE CLASS LINK — Google Meet / Zoom */}
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold' }}>🔴 Live class link (Google Meet / Zoom)</label>
                                <input
                                    type="url"
                                    name="liveLink"
                                    value={formData.liveLink}
                                    onChange={handleLessonChange}
                                    className="form-control"
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    This link gives students a &quot;Join Live Class&quot; button on the lesson.
                                </small>
                            </div>

                            <div className="form-group">
                                <label style={{ fontWeight: 'bold' }}>When is the live class? (optional)</label>
                                <input
                                    type="text"
                                    name="liveTime"
                                    value={formData.liveTime}
                                    onChange={handleLessonChange}
                                    className="form-control"
                                    placeholder="e.g. Daily 6 PM — Mon/Wed/Fri"
                                />
                            </div>

                                <form onSubmit={handleQuickAdd}>
                                    <div className="form-group">
                                        <label style={{ fontWeight: 'bold' }}>Lesson Title</label>
                                        <input type="text" value={quickData.title} onChange={(e) => setQuickData({ ...quickData, title: e.target.value })} className="form-control" placeholder="e.g. Lecture 1: Introduction" required />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '12px' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold' }}>🎬 Option 1: Upload Video File</label>
                                            <input key={`qv-${quickFileKey}`} type="file" accept="video/*" onChange={(e) => setQuickVideo(e.target.files[0])} className="form-control" />
                                            {quickVideo && <small style={{ color: '#16a34a' }}>✓ {quickVideo.name} selected</small>}
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold' }}>🎥 Option 2: OR YouTube Link</label>
                                            <input type="text" value={quickData.videoUrl} onChange={(e) => setQuickData({ ...quickData, videoUrl: e.target.value })} className="form-control" placeholder="https://youtube.com/watch?v=..." />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label style={{ fontWeight: 'bold' }}>📝 Theory / Notes (optional — you can paste links too)</label>
                                        <textarea value={quickData.theoryContent} onChange={(e) => setQuickData({ ...quickData, theoryContent: e.target.value })} className="form-control" rows="3" placeholder="Lesson notes, explanation, or any link..."></textarea>
                                    </div>
                                    {/* 📺 TOPIC — the quiz is generated from this topic */}
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label style={{ fontWeight: 'bold' }}>📺 Topic (optional — what this lesson covers)</label>
                                        <input type="text" value={quickData.topic} onChange={(e) => setQuickData({ ...quickData, topic: e.target.value })} className="form-control" placeholder="e.g. What is HTML? (The quiz is generated from this topic)" />
                                    </div>
                                    {/* 🔴 LIVE CLASS — Google Meet / Zoom link */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '12px' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold' }}>🔴 Live Class Link (optional)</label>
                                            <input type="text" value={quickData.liveLink} onChange={(e) => setQuickData({ ...quickData, liveLink: e.target.value })} className="form-control" placeholder="https://meet.google.com/..." />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold' }}>⏰ Live Time (optional)</label>
                                            <input type="text" value={quickData.liveTime} onChange={(e) => setQuickData({ ...quickData, liveTime: e.target.value })} className="form-control" placeholder="e.g. Daily 6 PM" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '12px' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold' }}>📎 Option 3: Attach PDF / Notes File</label>
                                            <input key={`qp-${quickFileKey}`} type="file" accept=".pdf,image/*,.zip,.doc,.docx,.txt,.md" onChange={(e) => setQuickPdf(e.target.files[0])} className="form-control" />
                                            {quickPdf && <small style={{ color: '#16a34a' }}>✓ {quickPdf.name} selected</small>}
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 'bold' }}>📂 Put in Chapter (optional)</label>
                                            <select value={quickChapter} onChange={(e) => setQuickChapter(e.target.value)} className="form-control">
                                                <option value="">— No chapter (Unassigned) —</option>
                                                {allChaptersFlat.map(chap => (
                                                    <option key={chap._id} value={chap._id}>{chap.moduleTitle ? `${chap.moduleTitle} → ` : ''}{chap.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', backgroundColor: '#4f46e5', borderColor: '#4f46e5' }}>
                                        ➕ Add Lesson to Course
                                    </button>
                                </form>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                {modules.map((mod, index) => (
                                    <div key={mod._id} style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <h4 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '1.2rem' }}>
                                            <span style={{ color: '#10b981', marginRight: '10px' }}>Module {index + 1}:</span> {mod.title}
                                        </h4>
                                        
                                        <div style={{ paddingLeft: '15px', borderLeft: '2px solid #d1d5db' }}>
                                            {(chapters[mod._id] || []).map((chap, cIndex) => (
                                                <div key={chap._id} style={{ padding: '15px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '15px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <strong style={{ fontSize: '1.1rem', color: '#374151' }}>Chapter {cIndex + 1}: {chap.title}</strong>
                                                        <button 
                                                            onClick={() => setShowLessonForm(showLessonForm === chap._id ? null : chap._id)} 
                                                            className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: '#4f46e5', color: '#4f46e5' }}>
                                                            {showLessonForm === chap._id ? 'Cancel' : '+ Add Video / Lesson'}
                                                        </button>
                                                    </div>

                                                    {showLessonForm === chap._id && (
                                                        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f0fdf4', border: '1px dashed #22c55e', borderRadius: '8px' }}>
                                                            <form onSubmit={(e) => handleLessonSubmit(e, chap._id)}>
                                                                <div className="form-group"><label>Lesson Title</label><input type="text" name="title" value={formData.title} onChange={handleLessonChange} className="form-control" required /></div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                                                    <div className="form-group"><label>🎬 Option 1: Upload Video File (mp4/webm/mov)</label><input type="file" id="videoInput" accept="video/*" onChange={(e) => setVideoFile(e.target.files[0])} className="form-control" /></div>
                                                                    <div className="form-group"><label>🎥 Option 2: OR YouTube Link</label><input type="text" name="videoUrl" value={formData.videoUrl} onChange={handleLessonChange} className="form-control" placeholder="https://youtube.com/watch?v=..." /></div>
                                                                </div>
                                                                <div className="form-group" style={{ marginTop: '15px' }}><label>📝 Theory / Notes (optional)</label><textarea name="theoryContent" value={formData.theoryContent} onChange={handleLessonChange} className="form-control"></textarea></div>
                                                                <div className="form-group" style={{ marginTop: '15px' }}><label>📺 Topic (optional — the quiz is generated from this topic)</label><input type="text" name="topic" value={formData.topic} onChange={handleLessonChange} className="form-control" placeholder="e.g. What is HTML?" /></div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                                                                    <div className="form-group"><label>🔴 Live Class Link (optional)</label><input type="text" name="liveLink" value={formData.liveLink} onChange={handleLessonChange} className="form-control" placeholder="https://meet.google.com/..." /></div>
                                                                    <div className="form-group"><label>⏰ Live Time (optional)</label><input type="text" name="liveTime" value={formData.liveTime} onChange={handleLessonChange} className="form-control" placeholder="e.g. Daily 6 PM" /></div>
                                                                </div>
                                                                <div className="form-group" style={{ marginTop: '15px', marginBottom: '15px' }}><label>📎 Attach PDF / Notes File (optional)</label><input type="file" id="fileInput" onChange={(e) => setAttachmentFile(e.target.files[0])} className="form-control" /></div>
                                                                <button type="submit" className="btn btn-primary" style={{ width: '100%', backgroundColor: '#22c55e', borderColor: '#22c55e' }}>Upload Lesson to Chapter</button>
                                                            </form>
                                                        </div>
                                                    )}

                                                    {/* 📄 Chapter PDF notes — upload / list / delete */}
                                                    <ChapterPdfManager chapterId={chap._id} initialPdfs={chap.pdfs || []} />

                                                    <div style={{ marginTop: '15px' }}>
                                                        {lessons.filter(l => l.chapterId === chap._id).map((lesson, lIndex) => (
                                                            <div key={lesson._id} style={{ padding: '10px 15px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <div>
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{lIndex + 1}. {lesson.title}</span><br/>
                                                                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                                            {lesson.videoFile ? '🎬 Server Video' : (lesson.videoUrl ? '🎥 YouTube Video' : '📝 Text')} {lesson.attachment && ' | 📎 File'} {(lesson.materials?.length > 0) && ` | 📚 ${lesson.materials.length} Materials`}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                                                                        <button
                                                                            onClick={() => setEditingLessonId(editingLessonId === lesson._id ? null : lesson._id)}
                                                                            className="btn btn-outline"
                                                                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#0284c7', color: '#0284c7' }}
                                                                        >
                                                                            {editingLessonId === lesson._id ? '✕ Close Edit' : '✏️ Edit'}
                                                                        </button>
                                                                        <button onClick={() => handleAddMaterial(lesson._id)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: '#4f46e5', color: '#4f46e5' }}>
                                                                            📎 Material
                                                                        </button>
                                                                        <button onClick={() => toggleQuizPanel(lesson._id)} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                                                            {activeQuizLesson === lesson._id ? 'Close Quiz' : 'Manage Quizzes'}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* ✏️ EDIT FORM — inline, only when the Edit button for this lesson is pressed */}
                                                                {editingLessonId === lesson._id && (
                                                                    <LessonEditor
                                                                        lesson={lesson}
                                                                        allChapters={allChaptersFlat}
                                                                        onClose={() => setEditingLessonId(null)}
                                                                        onUpdated={handleLessonUpdated}
                                                                        onDeleted={handleLessonDeleted}
                                                                    />
                                                                )}
                                                                {/* 🚀 Materials chips (download links) */}
                                                                {(lesson.materials || []).length > 0 && (
                                                                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                        {lesson.materials.map((m, mi) => (
                                                                            <a key={mi} href={assetUrl(m.file)} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '3px 10px', borderRadius: '12px', textDecoration: 'none' }}>
                                                                                📄 {m.title}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                        {activeQuizLesson === lesson._id && (
                                                            <>
                                                                <div style={{ marginBottom: '10px' }}>
                                                                    {/* 🤖 Generate a quiz for this lesson/topic with AI */}
                                                                    <AIQuizGenerator
                                                                        lessonId={lesson._id}
                                                                        topic={lesson.topic || ''}
                                                                        compact
                                                                        onQuestionsGenerated={(generated) => setLessonQuizzes(prev => ({ ...prev, [lesson._id]: [...(prev[lesson._id] || []), ...generated] }))}
                                                                    />
                                                                </div>
                                                                <QuizBuilder
                                                                    lessonId={lesson._id}
                                                                    quizzes={lessonQuizzes[lesson._id] || []}
                                                                    onQuizAdded={(quiz) => setLessonQuizzes(prev => ({ ...prev, [lesson._id]: [...(prev[lesson._id] || []), quiz] }))}
                                                                    onQuizDeleted={(quizId) => setLessonQuizzes(prev => ({ ...prev, [lesson._id]: (prev[lesson._id] || []).filter(q => q._id !== quizId) }))}
                                                                />
                                                            </>
                                                        )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                                <input type="text" placeholder="Add new chapter here..." value={chapterInputs[mod._id] || ""} onChange={(e) => setChapterInputs(prev => ({ ...prev, [mod._id]: e.target.value }))} className="form-control" style={{ flex: 1, padding: '10px', fontSize: '0.9rem' }} />
                                                <button onClick={() => handleAddChapter(mod._id)} className="btn btn-outline" style={{ padding: '10px 15px', fontSize: '0.9rem' }}>+ Add Chapter</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 🏆 FINAL COURSE QUIZ — one big exam for the whole course (AI in 1 click) */}
                        <div className="dashboard-card" style={{ marginTop: '30px', padding: '25px', borderLeft: '4px solid #8b5cf6', background: '#faf5ff' }}>
                            <h3 style={{ marginBottom: '8px' }}>🏆 Final Course Quiz</h3>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '15px', lineHeight: '1.6' }}>
                                This is the <strong>final exam for the whole course</strong> — questions are generated by AI from the notes of every lesson.
                                Students see this at the end of the course. Without an AI key, questions are still generated offline from the notes.
                            </p>
                            <AIQuizGenerator
                                courseId={id}
                                topic="Complete Course Revision"
                                onQuestionsGenerated={(generated) => setCourseQuizzes(prev => [...prev, ...generated])}
                            />

                            {courseQuizzes.length > 0 && (
                                <div style={{ marginTop: '15px' }}>
                                    <strong style={{ fontSize: '0.9rem', color: '#6d28d9' }}>
                                        ✅ The Final Quiz currently has {courseQuizzes.length} question(s):
                                    </strong>
                                    {courseQuizzes.map((q, i) => (
                                        <div key={q._id || i} style={{ marginTop: '8px', padding: '10px 12px', background: '#fff', border: '1px solid #ddd6fe', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                                                Q{i + 1}. {q.questionText || q.question}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                                Options: {(q.options || []).map((o, oi) => `${oi + 1}) ${typeof o === 'string' ? o : o.text}`).join('  |  ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {unassignedLessons.length > 0 && (
                            <div className="dashboard-card" style={{ padding: '25px', borderLeft: '4px solid #f59e0b', marginTop: '30px' }}>
                                <h3 style={{ marginBottom: '15px', color: '#d97706' }}>⚠️ Unassigned / Old Lessons ({unassignedLessons.length})</h3>
                                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '15px' }}>
                                    These videos were uploaded using the old method and are not assigned to any chapter.
                                </p>
                                
                                {unassignedLessons.map((lesson, index) => (
                                    <div key={lesson._id} style={{ padding: '15px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#92400e' }}>{index + 1}. {lesson.title}</span>
                                            
                                            {/* ✏️ Edit + Material + Quiz buttons */}
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => setEditingLessonId(editingLessonId === lesson._id ? null : lesson._id)}
                                                    className="btn btn-outline"
                                                    style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: '#0284c7', color: '#0284c7' }}
                                                >
                                                    {editingLessonId === lesson._id ? '✕ Close Edit' : '✏️ Edit'}
                                                </button>
                                                <button onClick={() => handleAddMaterial(lesson._id)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: '#4f46e5', color: '#4f46e5' }}>
                                                    📎 Material
                                                </button>
                                                <button onClick={() => toggleQuizPanel(lesson._id)} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: '#d97706', color: '#d97706' }}>
                                                    {activeQuizLesson === lesson._id ? 'Close Quiz' : 'Manage Quizzes'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* ✏️ EDIT FORM */}
                                        {editingLessonId === lesson._id && (
                                            <LessonEditor
                                                lesson={lesson}
                                                allChapters={allChaptersFlat}
                                                onClose={() => setEditingLessonId(null)}
                                                onUpdated={handleLessonUpdated}
                                                onDeleted={handleLessonDeleted}
                                            />
                                        )}
                                        {(lesson.materials || []).length > 0 && (
                                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {lesson.materials.map((m, mi) => (
                                                    <a key={mi} href={assetUrl(m.file)} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '3px 10px', borderRadius: '12px', textDecoration: 'none' }}>
                                                        📄 {m.title}
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {/* Quiz Panel Logic for Unassigned Lessons */}
                                                                                                {activeQuizLesson === lesson._id && (
                                                            <QuizBuilder
                                                                lessonId={lesson._id}
                                                                quizzes={lessonQuizzes[lesson._id] || []}
                                                                onQuizAdded={(quiz) => setLessonQuizzes(prev => ({ ...prev, [lesson._id]: [...(prev[lesson._id] || []), quiz] }))}
                                                                onQuizDeleted={(quizId) => setLessonQuizzes(prev => ({ ...prev, [lesson._id]: (prev[lesson._id] || []).filter(q => q._id !== quizId) }))}
                                                            />
                                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* 🚀 NEW: Course Details Edit Panel (Requirement 3.2 — Update courses) */}
                {viewMode === 'details' && courseMeta && (
                    <div className="dashboard-card" style={{ marginBottom: '30px', padding: '25px', borderLeft: '4px solid #4f46e5' }}>
                        <h3 style={{ marginBottom: '15px' }}>✏️ Edit Course Details</h3>
                        <form onSubmit={handleCourseMetaSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold' }}>Course Title</label>
                                <input type="text" name="title" value={courseMeta.title} onChange={handleCourseMetaChange} className="form-control" required />
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold' }}>Description</label>
                                <textarea name="description" value={courseMeta.description} onChange={handleCourseMetaChange} className="form-control" rows="3" style={{ resize: 'none' }}></textarea>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold' }}>Category</label>
                                    <select name="category" value={courseMeta.category} onChange={handleCourseMetaChange} className="form-control">
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    {/* 🎓 Which class is this for */}
                                    <label style={{ fontWeight: 'bold' }}>For which class?</label>
                                    <select name="grade" value={courseMeta.grade || 'All'} onChange={handleCourseMetaChange} className="form-control">
                                        {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g === 'All' ? 'All classes' : g === 'UG' ? 'UG (College)' : `Class ${g}`}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold' }}>Language</label>
                                    <select name="language" value={courseMeta.language} onChange={handleCourseMetaChange} className="form-control">
                                        <option value="Hindi">Hindi</option>
                                        <option value="English">English</option>
                                        <option value="Hinglish">Hinglish</option>
                                    </select>
                                </div>
                                {/* 🌍 This is only shown inside the Language category */}
                                {courseMeta.category === 'Language' && (
                                    <div className="form-group">
                                        <label style={{ fontWeight: 'bold' }}>Which language is taught?</label>
                                        <select name="courseLanguage" value={courseMeta.courseLanguage || ''} onChange={handleCourseMetaChange} className="form-control">
                                            <option value="">Select Language</option>
                                            {COURSE_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold' }}>Level</label>
                                    <select name="level" value={courseMeta.level} onChange={handleCourseMetaChange} className="form-control">
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold' }}>Price (in ₹)</label>
                                <input type="number" name="price" value={courseMeta.price} onChange={handleCourseMetaChange} className="form-control" min="0" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold' }}>Requirements (one per line)</label>
                                    <textarea name="requirements" value={courseMeta.requirements} onChange={handleCourseMetaChange} className="form-control" rows="3" style={{ resize: 'none' }}></textarea>
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold' }}>Learning Outcomes (one per line)</label>
                                    <textarea name="learningOutcomes" value={courseMeta.learningOutcomes} onChange={handleCourseMetaChange} className="form-control" rows="3" style={{ resize: 'none' }}></textarea>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold' }}>New Thumbnail (optional)</label>
                                    <input type="file" accept="image/*" onChange={(e) => setMetaThumbnail(e.target.files[0])} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 'bold' }}>New Trailer Video (optional)</label>
                                    <input type="file" accept="video/*" onChange={(e) => setMetaTrailer(e.target.files[0])} className="form-control" />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: 'auto', alignSelf: 'flex-start' }}>Save Course Details</button>
                        </form>
                    </div>
                )}

                {viewMode === 'timetable' && courseMeta && (
                    <>
                        <div className="dashboard-card" style={{ marginBottom: '25px', padding: '25px' }}>
                            <h3 style={{ marginBottom: '5px' }}>📅 Class Timetable</h3>
                            <p style={{ fontSize: '0.86rem', color: '#6b7280', marginBottom: '18px' }}>
                                Set when your live classes happen. Students see this as a weekly timetable (like PW / Byju's),
                                and the AI assistant answers "when is class?" from this same data.
                            </p>
                            <ScheduleEditor
                                value={schedule}
                                onChange={setSchedule}
                                note={scheduleNote}
                                onNoteChange={setScheduleNote}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                                <button onClick={handleCourseMetaSubmit} className="btn btn-primary">
                                    💾 Save Timetable
                                </button>
                            </div>
                        </div>

                        {/* Live preview — what the student will see */}
                        {schedule.length > 0 && (
                            <div className="dashboard-card" style={{ padding: '25px' }}>
                                <h3 style={{ marginBottom: '15px' }}>👀 Student Preview</h3>
                                <ClassTimetable schedule={schedule} note={scheduleNote} />
                            </div>
                        )}
                    </>
                )}

                {viewMode === 'analytics' && (
                    <div className="dashboard-card" style={{ padding: '25px' }}>
                        <h2 style={{ marginBottom: '15px' }}>Student Analytics & Reports</h2>
                        {analytics.length === 0 ? (
                            <p>No student data available yet.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {analytics.map((studentRecord, idx) => (
                                    <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden', backgroundColor: 'white' }}>
                                        <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 5px 0', color: '#1f2937' }}>👤 {studentRecord.studentId?.name || "Student"}</h3>
                                                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>📧 {studentRecord.studentId?.email || "N/A"}</span>
                                            </div>
                                            
                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>
                                                    <strong>Videos Watched:</strong> <span style={{ padding: '2px 8px', backgroundColor: '#f3f4f6', borderRadius: '12px' }}>{studentRecord.completedLessons?.length || 0} / {lessons.length}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: '#15803d' }}>
                                                    <strong>Quiz Score:</strong> <span style={{ padding: '2px 8px', backgroundColor: '#dcfce7', borderRadius: '12px', fontWeight: 'bold' }}>{studentRecord.totalScoreObtained || 0}</span> 
                                                    <span style={{ color: '#6b7280', fontSize: '0.8rem', marginLeft: '5px' }}>(Attempts: {studentRecord.totalAttemptedQuizzes || 0})</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditCourse;