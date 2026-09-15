import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api.js';

// 🚀 Reusable Quiz Builder (Requirement: components/QuizBuilder)
// Teacher kisi bhi lecture ke liye quiz questions add/delete kar sakta hai
const QuizBuilder = ({ lessonId, quizzes = [], onQuizAdded, onQuizDeleted }) => {
    const [quizData, setQuizData] = useState({
        questionText: '', opt1: '', opt2: '', opt3: '', opt4: '',
        correctOption: '1', explanation: '', marks: 1, difficulty: 'medium'
    });

    const handleQuizChange = (e) => setQuizData({ ...quizData, [e.target.name]: e.target.value });

    // Naya question save karna
    const handleQuizSubmit = async (e) => {
        e.preventDefault();
        try {
            const optionsArray = [quizData.opt1, quizData.opt2, quizData.opt3, quizData.opt4];
            const response = await api.post('/quizzes/create', {
                lessonId,
                questionText: quizData.questionText,
                options: optionsArray,
                correctAnswer: optionsArray[parseInt(quizData.correctOption) - 1],
                explanation: quizData.explanation,
                marks: Number(quizData.marks) || 1,
                difficulty: quizData.difficulty
            });
            toast.success('Question added!');
            onQuizAdded && onQuizAdded(response.data.quiz);
            setQuizData({ questionText: '', opt1: '', opt2: '', opt3: '', opt4: '', correctOption: '1', explanation: '', marks: 1, difficulty: 'medium' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add quiz');
        }
    };

    // Question delete karna
    const handleDeleteQuiz = async (quizId) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            try {
                await api.delete(`/quizzes/${quizId}`);
                toast.success('Question deleted!');
                onQuizDeleted && onQuizDeleted(quizId);
            } catch (error) {
                toast.error('Failed to delete question.');
            }
        }
    };

    return (
        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <h4 style={{ color: '#0f172a', marginBottom: '10px', fontSize: '1rem' }}>Questions ({quizzes.length})</h4>

            <ul style={{ paddingLeft: 0, listStyle: 'none', margin: '0 0 15px 0' }}>
                {quizzes.map((q, qIndex) => (
                    <li key={q._id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '10px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                            <strong>Q{qIndex + 1}:</strong> {q.questionText} <br />
                            <span style={{ color: '#16a34a' }}>Ans: {q.correctAnswer}</span>
                            <span style={{ color: '#8b5cf6', marginLeft: '8px' }}>({q.difficulty}, {q.marks} marks)</span>
                        </div>
                        <button onClick={() => handleDeleteQuiz(q._id)} className="btn btn-outline" style={{ padding: '2px 8px', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444' }}>Delete</button>
                    </li>
                ))}
            </ul>

            <h4 style={{ color: '#0f172a', marginBottom: '10px', fontSize: '1rem' }}>+ Add Question</h4>
            <form onSubmit={handleQuizSubmit}>
                <input type="text" name="questionText" value={quizData.questionText} onChange={handleQuizChange} className="form-control" placeholder="Question Text" required style={{ marginBottom: '10px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" name="opt1" value={quizData.opt1} onChange={handleQuizChange} className="form-control" placeholder="Option 1" required />
                    <input type="text" name="opt2" value={quizData.opt2} onChange={handleQuizChange} className="form-control" placeholder="Option 2" required />
                    <input type="text" name="opt3" value={quizData.opt3} onChange={handleQuizChange} className="form-control" placeholder="Option 3" required />
                    <input type="text" name="opt4" value={quizData.opt4} onChange={handleQuizChange} className="form-control" placeholder="Option 4" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <select name="correctOption" value={quizData.correctOption} onChange={handleQuizChange} className="form-control">
                        <option value="1">Ans: 1</option><option value="2">Ans: 2</option><option value="3">Ans: 3</option><option value="4">Ans: 4</option>
                    </select>
                    <select name="difficulty" value={quizData.difficulty} onChange={handleQuizChange} className="form-control">
                        <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                    </select>
                    <input type="number" name="marks" value={quizData.marks} onChange={handleQuizChange} className="form-control" placeholder="Marks" min="1" required />
                </div>
                <input type="text" name="explanation" value={quizData.explanation} onChange={handleQuizChange} className="form-control" placeholder="Explanation (optional)" style={{ marginTop: '10px' }} />
                <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', padding: '6px 12px', fontSize: '0.85rem' }}>Save Question</button>
            </form>
        </div>
    );
};

export default QuizBuilder;