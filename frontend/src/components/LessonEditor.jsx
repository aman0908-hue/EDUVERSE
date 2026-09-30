import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api.js';
import { Pencil, X, Save, Trash2, Video, MonitorPlay, FileText, Link2, Clock } from 'lucide-react';

/**
 * ✏️ LESSON EDITOR (teacher-only)
 * Ek lesson ko edit ya delete karne ke liye inline form.
 * Backend: PUT /lessons/:lectureId , DELETE /lessons/:lectureId
 *
 *  - Title, YouTube link, notes
 *  - 📺 Topic (quiz isi se banti hai)
 *  - 🔴 Live class link + time
 *  - 🎬 Naya video file / 📎 naya notes PDF (na do to purana bacha rahega)
 *  - 🗑️ Delete with confirmation
 */
const LessonEditor = ({ lesson, allChapters = [], onClose, onUpdated, onDeleted }) => {
    const [form, setForm] = useState({
        title: lesson.title || '',
        videoUrl: lesson.videoUrl || '',
        theoryContent: lesson.theoryContent || '',
        topic: lesson.topic || '',
        liveLink: lesson.liveLink || '',
        liveTime: lesson.liveTime || '',
        chapterId: lesson.chapterId || '',
    });
    const [videoFile, setVideoFile] = useState(null);
    const [attachment, setAttachment] = useState(null);
    const [fileKey, setFileKey] = useState(0);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        setForm({
            title: lesson.title || '',
            videoUrl: lesson.videoUrl || '',
            theoryContent: lesson.theoryContent || '',
            topic: lesson.topic || '',
            liveLink: lesson.liveLink || '',
            liveTime: lesson.liveTime || '',
            chapterId: lesson.chapterId || '',
        });
        setVideoFile(null); setAttachment(null); setFileKey(k => k + 1);
        setConfirmDelete(false);
    }, [lesson._id]);

    const change = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error('Lesson title zaroori hai!');

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title.trim());
            fd.append('videoUrl', form.videoUrl);
            fd.append('theoryContent', form.theoryContent);
            fd.append('topic', form.topic);
            fd.append('liveLink', form.liveLink);
            fd.append('liveTime', form.liveTime);
            fd.append('chapterId', form.chapterId);
            if (videoFile) fd.append('videoFile', videoFile);
            if (attachment) fd.append('attachmentFile', attachment);

            const loadingToast = toast.loading('Saving changes...');
            const res = await api.put(`/lessons/${lesson._id}`, fd);
            toast.dismiss(loadingToast);
            toast.success('Lesson update ho gaya! ✅');
            onUpdated?.(res.data.lesson || res.data.lecture);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update fail ho gaya');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/lessons/${lesson._id}`);
            toast.success('Lesson delete ho gaya! 🗑️');
            onDeleted?.(lesson._id);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Delete fail ho gaya');
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <div style={{ marginTop: '10px', padding: '16px', background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '8px' }}>
            <form onSubmit={handleSave}>
                <div className="form-group">
                    <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} /> Lesson Title
                    </label>
                    <input type="text" name="title" value={form.title} onChange={change} className="form-control" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '12px' }}>
                    <div className="form-group">
                        <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Video size={14} /> 🎬 Naya Video File
                        </label>
                        <input key={`ev-${fileKey}`} type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} className="form-control" />
                        <small style={{ color: lesson.videoFile ? '#16a34a' : '#9ca3af' }}>
                            {videoFile ? `✓ Naya: ${videoFile.name}` : (lesson.videoFile ? `Current: ${lesson.videoFile} (rehne dooga)` : 'Koi video nahi')}
                        </small>
                    </div>
                    <div className="form-group">
                        <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MonitorPlay size={14} /> 🎥 YouTube Link
                        </label>
                        <input type="text" name="videoUrl" value={form.videoUrl} onChange={change} className="form-control" placeholder="https://youtube.com/watch?v=..." />
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                    <label style={{ fontWeight: 'bold' }}>📝 Notes / Theory</label>
                    <textarea name="theoryContent" value={form.theoryContent} onChange={change} className="form-control" rows="3" />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                    <label style={{ fontWeight: 'bold' }}>📺 Topic (quiz isi se banti hai)</label>
                    <input type="text" name="topic" value={form.topic} onChange={change} className="form-control" placeholder="e.g. Kya hota hai HTML?" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '12px' }}>
                    <div className="form-group">
                        <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link2 size={14} /> 🔴 Live Class Link
                        </label>
                        <input type="text" name="liveLink" value={form.liveLink} onChange={change} className="form-control" placeholder="https://meet.google.com/..." />
                    </div>
                    <div className="form-group">
                        <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} /> ⏰ Live Time
                        </label>
                        <input type="text" name="liveTime" value={form.liveTime} onChange={change} className="form-control" placeholder="e.g. Daily 6 PM" />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '12px' }}>
                    <div className="form-group">
                        <label style={{ fontWeight: 'bold' }}>📂 Chapter</label>
                        <select name="chapterId" value={form.chapterId} onChange={change} className="form-control">
                            <option value="">— Unassigned —</option>
                            {allChapters.map(c => (
                                <option key={c._id} value={c._id}>{c.moduleTitle ? `${c.moduleTitle} → ` : ''}{c.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label style={{ fontWeight: 'bold' }}>📎 Naya Notes/PDF File</label>
                        <input key={`ea-${fileKey}`} type="file" accept=".pdf,image/*,.zip,.doc,.docx,.txt,.md" onChange={e => setAttachment(e.target.files[0])} className="form-control" />
                        <small style={{ color: lesson.attachment ? '#16a34a' : '#9ca3af' }}>
                            {attachment ? `✓ Naya: ${attachment.name}` : (lesson.attachment ? `Current: ${lesson.attachment}` : 'Koi file nahi')}
                        </small>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="submit" disabled={saving} className="btn btn-primary"
                        style={{ backgroundColor: '#0284c7', borderColor: '#0284c7', opacity: saving ? 0.6 : 1 }}>
                        <Save size={14} /> {saving ? 'Saving...' : '💾 Save Changes'}
                    </button>
                    <button type="button" onClick={onClose} className="btn btn-outline" style={{ borderColor: '#6b7280', color: '#6b7280' }}>
                        <X size={14} /> Cancel
                    </button>

                    <div style={{ marginLeft: 'auto' }}>
                        {!confirmDelete ? (
                            <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                                <Trash2 size={14} /> 🗑️ Delete
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 'bold' }}>Sach me delete karna hai?</span>
                                <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-primary"
                                    style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', opacity: deleting ? 0.6 : 1 }}>
                                    {deleting ? 'Deleting...' : 'Haan, delete karo'}
                                </button>
                                <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn-outline" style={{ borderColor: '#6b7280', color: '#6b7280' }}>Nahi</button>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}

export default LessonEditor;
