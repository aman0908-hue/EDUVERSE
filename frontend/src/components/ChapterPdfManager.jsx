import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { assetUrl } from '../utils/api.js';
import { FileText, Upload, Trash2 } from 'lucide-react';

/**
 * 📄 Chapter PDF manager (teacher-only)
 * Chapter/unit me PDF notes upload, list aur delete karta hai.
 * Backend: POST/DELETE /chapters/:chapterId/pdf
 */
const ChapterPdfManager = ({ chapterId, initialPdfs = [], onChange }) => {
    const [pdfs, setPdfs] = useState(initialPdfs || []);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    const sync = next => {
        setPdfs(next);
        onChange?.(next);
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Frontend pe hi PDF check — server par bhi check hai
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Sirf PDF file allowed hai');
            e.target.value = '';
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast.error('PDF 25MB se chhoti honi chahiye');
            e.target.value = '';
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('pdfFile', file);
            if (title.trim()) formData.append('pdfTitle', title.trim());

            const response = await api.post(`/chapters/${chapterId}/pdf`, formData);
            const updated = response.data.chapter?.pdfs || [];
            sync(updated);
            setTitle('');
            toast.success('PDF upload ho gayi!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'PDF upload nahi ho payi');
        } finally {
            setLoading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (pdfId) => {
        try {
            const response = await api.delete(`/chapters/${chapterId}/pdf/${pdfId}`);
            sync(response.data.chapter?.pdfs || []);
            toast.success('PDF delete ho gayi');
        } catch (error) {
            toast.error(error.response?.data?.message || 'PDF delete nahi hui');
        }
    };

    return (
        <div style={{
            marginTop: '10px', padding: '12px', background: '#fffbeb',
            border: '1px solid #fcd34d', borderRadius: '8px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <FileText size={15} color="#b45309" />
                <strong style={{ fontSize: '0.85rem', color: '#92400e' }}>📄 Chapter ke PDF Notes</strong>
            </div>

            {/* Already uploaded PDFs */}
            {pdfs.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                    {pdfs.map(pdf => (
                        <li key={pdf._id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '8px', padding: '8px 10px', marginBottom: '6px',
                            background: '#fff', border: '1px solid #fde68a', borderRadius: '6px'
                        }}>
                            <a
                                href={assetUrl(pdf.file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.8rem', color: '#b45309', textDecoration: 'none', fontWeight: '600' }}
                            >
                                📄 {pdf.title}
                            </a>
                            <button
                                onClick={() => handleDelete(pdf._id)}
                                className="btn btn-outline"
                                style={{ padding: '2px 8px', fontSize: '0.7rem', borderColor: '#ef4444', color: '#ef4444' }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="PDF ka naam (optional) — jaise 'Unit 1 Notes'"
                className="form-control"
                style={{ marginBottom: '8px', fontSize: '0.8rem' }}
            />
            <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '9px', background: '#fff', border: '1px dashed #f59e0b',
                borderRadius: '6px', cursor: loading ? 'wait' : 'pointer',
                fontSize: '0.8rem', fontWeight: '600', color: '#b45309'
            }}>
                <Upload size={14} />
                {loading ? 'Upload ho raha hai...' : 'PDF Choose Karein'}
                <input type="file" accept="application/pdf,.pdf" onChange={handleUpload} disabled={loading} style={{ display: 'none' }} />
            </label>
        </div>
    );
};

export default ChapterPdfManager;
