import { Plus, Trash2, CalendarClock } from 'lucide-react';
import { DAYS } from './timetableLogic.js';

const emptySlot = () => ({
    label: '',
    day: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    date: '',
    isLive: true,
    meetingLink: ''
});

/**
 * Class schedule editor — teacher yahan day + time set karta hai.
 * AI assistant isi data se student ko "kab hai class" batata hai.
 * Used by both CreateCourse and EditCourse.
 */
const ScheduleEditor = ({ value = [], onChange, note = '', onNoteChange }) => {
    const slots = Array.isArray(value) ? value : [];

    const update = (index, patch) => {
        onChange(slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
    };
    const remove = index => onChange(slots.filter((_, i) => i !== index));
    const add = () => onChange([...slots, emptySlot()]);

    return (
        <div className="schedule-editor">
            <div className="schedule-editor-head">
                <div>
                    <h4><CalendarClock size={16} /> Class Schedule</h4>
                    <p>Set the day and time of your classes. Students can then ask the AI “when is my next class?” and it will answer from this.</p>
                </div>
                <button type="button" className="btn btn-outline" onClick={add}>
                    <Plus size={15} /> Add class
                </button>
            </div>

            {slots.length === 0 ? (
                <p className="schedule-empty">
                    No schedule yet. If you leave this empty, the AI will tell students that no timetable has been set.
                </p>
            ) : (
                <div className="schedule-list">
                    {slots.map((slot, index) => (
                        <div className="schedule-row" key={index}>
                            <div className="schedule-row-grid">
                                <input
                                    type="text"
                                    value={slot.label || ''}
                                    onChange={e => update(index, { label: e.target.value })}
                                    placeholder="Class name (e.g. Week 1 — Intro)"
                                />
                                <select value={slot.day || 'Monday'} onChange={e => update(index, { day: e.target.value })}>
                                    {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
                                </select>
                                <input type="time" value={slot.startTime || '10:00'} onChange={e => update(index, { startTime: e.target.value })} />
                                <input type="time" value={slot.endTime || '11:00'} onChange={e => update(index, { endTime: e.target.value })} />
                                <button type="button" className="schedule-remove" onClick={() => remove(index)} aria-label="Remove class">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                            <div className="schedule-row-grid two">
                                <input
                                    type="date"
                                    value={slot.date || ''}
                                    onChange={e => update(index, { date: e.target.value })}
                                    title="Optional — for a one-off class instead of a weekly slot"
                                />
                                <label className="schedule-checkbox">
                                    <input type="checkbox" checked={slot.isLive !== false} onChange={e => update(index, { isLive: e.target.checked })} />
                                    Live class
                                </label>
                                <input
                                    type="url"
                                    value={slot.meetingLink || ''}
                                    onChange={e => update(index, { meetingLink: e.target.value })}
                                    placeholder="Meeting link (optional)"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <label className="schedule-note">
                <span>Schedule note (optional)</span>
                <input
                    type="text"
                    value={note || ''}
                    onChange={e => onNoteChange?.(e.target.value)}
                    placeholder="e.g. Lab happens every Saturday, doubt session on WhatsApp"
                />
            </label>
        </div>
    );
};



export default ScheduleEditor;
