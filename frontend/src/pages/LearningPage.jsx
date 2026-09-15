import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { UserContext } from '../context/UserContext'; // 🚀 Context import kiya
import toast from 'react-hot-toast';
import api from '../utils/api.js';

// YouTube Fix
const getYouTubeEmbedUrl = (url) => {
    if (!url) return "";
    if (url.includes("<iframe") && url.includes("src=")) {
        const match = url.match(/src="([^"]+)"/);
        if (match) return match[1];
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url; 
};

// 🚀 Notes ke andar URLs ko clickable links banata hai
const renderNotesWithLinks = (text) => {
    const parts = String(text).split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
        /^https?:\/\//.test(part)
            ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{ color: '#4f46e5', wordBreak: 'break-all', textDecoration: 'underline' }}>{part}</a>
            : part
    );
};

const LearningPage = () => {
    const params = useParams(); 
    const id = params.id || params.courseId; 
    
    // 🚀 USE CONTEXT FOR STUDENT ID (Jaise TeacherDashboard me kiya hai)
    const { user } = useContext(UserContext);
    const studentId = user?._id || user?.id;

    const [course, setCourse] = useState(null);
    const [modules, setModules] = useState([]);
    const [chapters, setChapters] = useState({});
    const [lessons, setLessons] = useState([]);
    const [expandedModule, setExpandedModule] = useState(null);
    const [expandedChapter, setExpandedChapter] = useState(null);
    const [currentLesson, setCurrentLesson] = useState(null);
    
    const [quizzes, setQuizzes] = useState([]);
    const [quizAnswers, setQuizAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [hasAttempted, setHasAttempted] = useState(false);
    const [quizResult, setQuizResult] = useState(null); 
    const [pastAnswers, setPastAnswers] = useState([]);

    // 🚀 REQUIREMENT 3.4: Mark lectures as complete/incomplete + progress tracking
    const [completedLessons, setCompletedLessons] = useState([]);

    useEffect(() => {
        const fetchCourseData = async () => {
            if (!id) return;
            try {
                const courseRes = await api.get(`/courses/${id}`);
                setCourse(courseRes.data.course);
            } catch (error) { console.error("Course load error:", error); }

            // 🚀 Progress fetch karo (kaun se lectures complete hain)
            if (studentId) {
                try {
                    const progRes = await api.get(`/progress/${studentId}/${id}`);
                    setCompletedLessons((progRes.data.progress?.completedLessons || []).map(c => (c._id || c).toString()));
                } catch (err) { console.log("No progress found yet"); }
            }

            try {
                const lessonRes = await api.get(`/lessons/${id}`);
                setLessons(lessonRes.data.lessons || []);
            } catch (error) { console.error("Lessons load error:", error); }

            try {
                const moduleRes = await api.get(`/modules/${id}`);
                const fetchedModules = moduleRes.data.modules || [];
                setModules(fetchedModules);
                fetchedModules.forEach(async (mod) => {
                    try {
                        const chapRes = await api.get(`/chapters/${mod._id}`);
                        setChapters(prev => ({ ...prev, [mod._id]: chapRes.data.chapters || [] }));
                    } catch (err) { console.error("Chapters load error"); }
                });
            } catch (error) { console.error("Modules load error:", error); }
        };
        fetchCourseData();
    }, [id]);

    useEffect(() => {
        const fetchLessonData = async () => {
            if (currentLesson) {
                // 1. Fetch Quizzes
                try {
                    const res = await api.get(`/quizzes/lesson/${currentLesson._id}`);
                    setQuizzes(res.data.quizzes || []);
                } catch (error) { console.log("No quizzes found"); }

                // 2. Fetch Attempt Status from Backend using studentId from Context
                if (studentId) {
                    try {
                        const statusRes = await api.get(`/quizzes/status/${currentLesson._id}?studentId=${studentId}`);
                        if (statusRes.data.attempted) {
                            setHasAttempted(true);
                            setQuizResult({
                                score: statusRes.data.score,
                                total: statusRes.data.totalMarks
                            });
                            setPastAnswers(statusRes.data.answers || []);
                        } else {
                            setHasAttempted(false);
                            setQuizResult(null);
                            setPastAnswers([]);
                            setQuizAnswers({}); 
                        }
                    } catch (error) { console.log("Error checking attempt status"); }
                }
            }
        };
        fetchLessonData();
    }, [currentLesson, studentId]);

    const toggleModule = (moduleId) => {
        setExpandedModule(expandedModule === moduleId ? null : moduleId);
        setExpandedChapter(null);
    };

    const toggleChapter = (chapterId) => {
        setExpandedChapter(expandedChapter === chapterId ? null : chapterId);
    };

    const handleOptionSelect = (quizId, selectedOption) => {
        if (!hasAttempted) {
            setQuizAnswers(prev => ({ ...prev, [quizId]: selectedOption }));
        }
    };

    // 🚀 REQUIREMENT 3.4: Lecture ko complete/incomplete mark karna
    const handleToggleComplete = async () => {
        if (!studentId) {
            toast.error("Please login as a student to track progress!");
            return;
        }
        if (!currentLesson) return;

        const isCompleted = completedLessons.includes(currentLesson._id);
        try {
            const endpoint = isCompleted ? '/progress/mark-incomplete' : '/progress/mark-complete';
            await api.post(endpoint, { studentId, courseId: id, lessonId: currentLesson._id });
            setCompletedLessons(prev => isCompleted
                ? prev.filter(lId => lId !== currentLesson._id)
                : [...prev, currentLesson._id]);
            toast.success(isCompleted ? 'Marked as incomplete' : 'Lecture completed! ✅');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update progress');
        }
    };

    const handleQuizSubmit = async () => {
        if (!studentId) {
            toast.error("Please login as a student to submit the quiz!");
            return;
        }

        if (Object.keys(quizAnswers).length < quizzes.length) {
            toast.error("Please answer all questions before submitting!");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post('/quizzes/submit', {
                courseId: id,
                lessonId: currentLesson._id,
                answers: quizAnswers,
                studentId: studentId // 🚀 Passing context studentId
            });

            if (response.data.success) {
                toast.success("Quiz Submitted Successfully!");
                
                // Fetch updated status instantly
                const statusRes = await api.get(`/quizzes/status/${currentLesson._id}?studentId=${studentId}`);
                if (statusRes.data.attempted) {
                    setHasAttempted(true);
                    setQuizResult({
                        score: statusRes.data.score,
                        total: statusRes.data.totalMarks
                    });
                    setPastAnswers(statusRes.data.answers || []);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit quiz");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPastSelection = (questionText) => {
        const found = pastAnswers.find(pa => pa.questionText === questionText);
        return found ? found.selectedOption : null;
    };

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-color)', overflow: 'hidden' }}>
            
            {/* LEFT SIDEBAR */}
            <div style={{ width: '300px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
                    <Link to="/student-dashboard" style={{ color: '#4f46e5', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        ← Back to Dashboard
                    </Link>
                    <h2 style={{ fontSize: '1.2rem', marginTop: '10px', color: '#1f2937' }}>
                        {course?.title || "Loading Course..."}
                    </h2>
                    {/* 🚀 Progress indicator */}
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '5px', marginBottom: 0 }}>
                        📊 {completedLessons.length} / {lessons.length} lessons completed
                    </p>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {modules.length === 0 && lessons.length === 0 ? (
                        <p style={{ padding: '20px', color: '#6b7280', fontSize: '0.9rem' }}>No content available yet.</p>
                    ) : (
                        <>
                            {modules.map((mod, mIndex) => (
                                <div key={mod._id} style={{ marginBottom: '10px' }}>
                                    <div onClick={() => toggleModule(mod._id)} style={{ padding: '12px', backgroundColor: expandedModule === mod._id ? '#e0e7ff' : '#f3f4f6', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Module {mIndex + 1}: {mod.title}</span>
                                        <span>{expandedModule === mod._id ? '▼' : '▶'}</span>
                                    </div>
                                    {expandedModule === mod._id && (
                                        <div style={{ paddingLeft: '15px', marginTop: '5px' }}>
                                            {(chapters[mod._id] || []).map((chap, cIndex) => (
                                                <div key={chap._id} style={{ marginBottom: '5px' }}>
                                                    <div onClick={() => toggleChapter(chap._id)} style={{ padding: '10px', borderLeft: '2px solid #4f46e5', cursor: 'pointer', fontSize: '0.95rem', color: expandedChapter === chap._id ? '#4f46e5' : '#4b5563', fontWeight: expandedChapter === chap._id ? 'bold' : 'normal' }}>
                                                        Chapter {cIndex + 1}: {chap.title}
                                                    </div>
                                                    {expandedChapter === chap._id && (
                                                        <div style={{ paddingLeft: '10px', borderLeft: '2px solid #e5e7eb', marginLeft: '2px' }}>
                                                            {lessons.filter(l => l.chapterId === chap._id).map((lesson, lIndex) => (
                                                                <div key={lesson._id} onClick={() => setCurrentLesson(lesson)} style={{ padding: '8px 10px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: currentLesson?._id === lesson._id ? '#dcfce7' : 'transparent', color: currentLesson?._id === lesson._id ? '#16a34a' : '#6b7280', borderRadius: '4px', margin: '2px 0' }}>
                                                                    {completedLessons.includes(lesson._id) ? '✅' : '▶'} {lIndex + 1}. {lesson.title}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {lessons.filter(l => !l.chapterId).length > 0 && (
                                <div style={{ marginTop: '20px', borderTop: '2px dashed #e5e7eb', paddingTop: '10px' }}>
                                    <h4 style={{ color: '#d97706', fontSize: '0.95rem', paddingLeft: '10px', marginBottom: '10px' }}>⚠️ Other Unassigned Videos</h4>
                                    <p style={{ fontSize: '0.8rem', color: '#6b7280', paddingLeft: '10px', marginBottom: '10px' }}>
                                        These videos were uploaded using the old method and are not assigned to any chapter.
                                    </p>
                                    {lessons.filter(l => !l.chapterId).map((lesson, lIndex) => (
                                        <div key={lesson._id} onClick={() => setCurrentLesson(lesson)} style={{ padding: '8px 10px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: currentLesson?._id === lesson._id ? '#fef3c7' : 'transparent', color: '#92400e', borderRadius: '4px', margin: '2px 0' }}>
                                            {completedLessons.includes(lesson._id) ? '✅' : '▶'} {lesson.title}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT MAIN CONTENT */}
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f9fafb' }}>
                {!currentLesson ? (
                    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#6b7280' }}>
                        <span style={{ fontSize: '4rem' }}>🎓</span>
                        <h2>Welcome to the Course!</h2>
                        <p>Select a video from the sidebar to start learning.</p>
                    </div>
                ) : (
                    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px 20px' }}>
                        <div style={{ backgroundColor: 'black', width: '100%', aspectRatio: '16/9', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                            {currentLesson.videoFile ? (
                                /* 🚀 REQUIREMENT: Chunked streaming (HTTP Range / 206) protected endpoint
                                   crossOrigin="use-credentials" se video tag cookie bhejta hai */
                                <video
                                    crossOrigin="use-credentials"
                                    src={`${import.meta.env.VITE_API_URL}/api/v1/lessons/video/stream/${currentLesson._id}`}
                                    onError={(e) => {
                                        // Fallback: agar stream fail ho jaye toh static file try karo
                                        if (!e.target.dataset.fallback) {
                                            e.target.dataset.fallback = 'true';
                                            e.target.src = `${import.meta.env.VITE_API_URL}/uploads/${currentLesson.videoFile}`;
                                        }
                                    }}
                                    controls autoPlay style={{ width: '100%', height: '100%' }} controlsList="nodownload" />
                            ) : currentLesson.videoUrl ? (
                                <iframe width="100%" height="100%" src={getYouTubeEmbedUrl(currentLesson.videoUrl)} title="YouTube video player" frameBorder="0" allowFullScreen></iframe>
                            ) : (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <p>No video available for this lesson.</p>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
                            <h1 style={{ margin: 0, color: '#111827', fontSize: '1.8rem' }}>{currentLesson.title}</h1>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {/* 🚀 REQUIREMENT 3.4: Mark complete/incomplete button */}
                                <button
                                    onClick={handleToggleComplete}
                                    className="btn"
                                    style={{
                                        textDecoration: 'none',
                                        backgroundColor: completedLessons.includes(currentLesson._id) ? '#dcfce7' : '#16a34a',
                                        color: completedLessons.includes(currentLesson._id) ? '#166534' : 'white',
                                        border: '1px solid #16a34a'
                                    }}>
                                    {completedLessons.includes(currentLesson._id) ? '✅ Completed — Mark Incomplete' : 'Mark as Complete ✓'}
                                </button>
                                {currentLesson.attachment && (
                                    <a href={`${import.meta.env.VITE_API_URL}/uploads/${currentLesson.attachment}`} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ textDecoration: 'none', backgroundColor: 'white', color: '#4f46e5', borderColor: '#4f46e5' }}>
                                        📎 Download Notes
                                    </a>
                                )}
                            </div>
                        </div>

                        {currentLesson.theoryContent && (
                            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '30px' }}>
                                <h3 style={{ marginTop: 0, color: '#374151' }}>Lesson Notes</h3>
                                <p style={{ color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{renderNotesWithLinks(currentLesson.theoryContent)}</p>
                            </div>
                        )}

                        {quizzes.length > 0 && (
                            <div style={{ backgroundColor: '#fffbeb', padding: '25px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 style={{ margin: 0, color: '#d97706' }}>📝 Knowledge Check (Quiz)</h3>
                                    
                                    {hasAttempted && quizResult && (
                                        <div style={{ backgroundColor: '#dcfce7', padding: '5px 15px', borderRadius: '20px', border: '1px solid #22c55e', color: '#15803d', fontWeight: 'bold' }}>
                                            Score: {quizResult.score} / {quizResult.total}
                                        </div>
                                    )}
                                </div>
                                
                                <p style={{ color: '#92400e', fontSize: '0.9rem', marginBottom: '20px' }}>
                                    {hasAttempted 
                                        ? "You have already completed this quiz. Here are your submitted answers." 
                                        : "Answer the questions below to test your understanding."}
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {quizzes.map((quiz, index) => {
                                        const pastSelectedOption = hasAttempted ? getPastSelection(quiz.questionText) : null;
                                        
                                        return (
                                            <div key={quiz._id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                                <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', color: '#1f2937' }}>Q{index + 1}. {quiz.questionText}</p>
                                                
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    {quiz.options.map((opt, i) => {
                                                        let isSelected = false;
                                                        let bgColor = 'transparent';
                                                        let borderColor = '#e5e7eb';
                                                        let textColor = 'black';

                                                        if (hasAttempted) {
                                                            isSelected = (pastSelectedOption === opt);
                                                            if (opt === quiz.correctAnswer) {
                                                                bgColor = '#dcfce7'; 
                                                                borderColor = '#22c55e';
                                                                textColor = '#15803d';
                                                            } else if (isSelected && opt !== quiz.correctAnswer) {
                                                                bgColor = '#fee2e2'; 
                                                                borderColor = '#ef4444';
                                                                textColor = '#b91c1c';
                                                            }
                                                        } else {
                                                            isSelected = (quizAnswers[quiz._id] === opt);
                                                            if (isSelected) {
                                                                bgColor = '#fef3c7'; 
                                                                borderColor = '#d97706';
                                                            }
                                                        }

                                                        return (
                                                            <label key={i} style={{ 
                                                                padding: '10px', 
                                                                border: `2px solid ${borderColor}`, 
                                                                backgroundColor: bgColor,
                                                                color: textColor,
                                                                borderRadius: '6px', 
                                                                cursor: hasAttempted ? 'default' : 'pointer', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '10px',
                                                                opacity: hasAttempted && !isSelected && opt !== quiz.correctAnswer ? 0.6 : 1
                                                            }}>
                                                                <input 
                                                                    type="radio" 
                                                                    name={`quiz-${quiz._id}`} 
                                                                    value={opt} 
                                                                    checked={isSelected} 
                                                                    onChange={() => handleOptionSelect(quiz._id, opt)} 
                                                                    disabled={hasAttempted} 
                                                                />
                                                                <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 'bold' : 'normal' }}>
                                                                    {opt} 
                                                                    {hasAttempted && opt === quiz.correctAnswer && " ✅"}
                                                                    {hasAttempted && isSelected && opt !== quiz.correctAnswer && " ❌"}
                                                                </span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {!hasAttempted && (
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleQuizSubmit} 
                                        disabled={isSubmitting} 
                                        style={{ marginTop: '20px', backgroundColor: '#d97706', borderColor: '#d97706', opacity: isSubmitting ? 0.7 : 1 }}>
                                        {isSubmitting ? "Submitting..." : "Submit Quiz Answers"}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LearningPage;