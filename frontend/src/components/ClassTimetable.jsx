import { CalendarClock, Video, Clock, CheckCircle2, Radio } from 'lucide-react';
import { buildWeeklyTimetable, buildUpcomingSessions } from './timetableLogic.js';

/**
 * PW (Physics Wallah) / Byju's jaisa weekly class timetable.
 * Student ko dikhta hai: aaj ka live class, aage ke classes, aur poora week grid.
 */
const ClassTimetable = ({ schedule = [], note = '', showGrid = true, canJoin = true }) => {
    if (!schedule?.length) return null;

    const { week, totalSlots } = buildWeeklyTimetable(schedule);
    const upcoming = buildUpcomingSessions(schedule, 4);
    const nextClass = upcoming[0];
    const liveNow = week.flatMap(d => d.slots).find(s => s.status === 'live');

    // 🔒 Only an enrolled student can join the class.
    //    For everyone else we render a locked element instead of a live link.
    //    canJoin is checked FIRST: the backend blanks meetingLink for
    //    non-enrolled callers, so a `!link` test would hide the lock entirely.
    const joinLink = (link, cls, children) => {
        if (!canJoin) {
            return (
                <span className={`btn-join is-locked ${cls || ''}`} title="Enroll in this course to join the class">
                    <Video size={16} /> {children}
                </span>
            );
        }
        if (!link) return null;
        return (
            <a className={`btn-join ${cls || ''}`} href={link} target="_blank" rel="noopener noreferrer">
                <Video size={16} /> {children}
            </a>
        );
    };

    return (
        <div className="class-timetable">
            {/* ---- Hero: live class ya next class ---- */}
            {(liveNow || nextClass) && (
                <div className={`timetable-hero ${liveNow ? 'is-live' : ''}`}>
                    {liveNow ? (
                        <>
                            <span className="timetable-live-badge"><Radio size={13} /> LIVE NOW</span>
                            <h3>{liveNow.label}</h3>
                            <p className="timetable-hero-time"><Clock size={14} /> {liveNow.startPretty} – {liveNow.endPretty}</p>
                            {joinLink(liveNow.meetingLink, '', 'Join live class')}
                        </>
                    ) : (
                        <>
                            <span className="timetable-next-badge"><CalendarClock size={13} /> {nextClass.isToday ? 'TODAY' : 'NEXT CLASS'}</span>
                            <h3>{nextClass.label}</h3>
                            <p className="timetable-hero-time">
                                <Clock size={14} />
                                {nextClass.isToday ? 'Today' : nextClass.shortDay} · {nextClass.startPretty} – {nextClass.endPretty}
                            </p>
                            {joinLink(nextClass.meetingLink, '', 'Join class')}
                        </>
                    )}
                </div>
            )}

            {/* ---- Aage ke classes strip ---- */}
            {upcoming.length > 1 && (
                <div className="timetable-upcoming">
                    <h4>Upcoming classes</h4>
                    <div className="timetable-chips">
                        {upcoming.map((s, i) => (
                            <div key={i} className={`timetable-chip ${s.status === 'live' ? 'is-live' : ''}`}>
                                <span className="timetable-chip-day">{s.isToday ? 'Today' : s.shortDay}</span>
                                <span className="timetable-chip-time">{s.startPretty}</span>
                                <span className="timetable-chip-label">{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ---- Weekly grid ---- */}
            {showGrid && (
                <>
                    <h4 className="timetable-week-title">Weekly schedule <span>· {totalSlots} class{totalSlots === 1 ? '' : 'es'} a week</span></h4>
                    <div className="timetable-grid">
                        {week.map(d => (
                            <div key={d.day} className={`timetable-day ${d.isToday ? 'is-today' : ''}`}>
                                <div className="timetable-day-head">
                                    <strong>{d.short}</strong>
                                    {d.isToday && <span className="timetable-today-dot">Today</span>}
                                </div>
                                {d.slots.length === 0 ? (
                                    <p className="timetable-no-class">No class</p>
                                ) : (
                                    d.slots.map((s, i) => (
                                        <div key={i} className={`timetable-slot status-${s.status}`}>
                                            <span className="timetable-slot-time">{s.startPretty}</span>
                                            <span className="timetable-slot-label">{s.label}</span>
                                            {s.status === 'live' && <span className="timetable-slot-live">Live</span>}
                                            {s.status === 'ended' && <CheckCircle2 size={12} className="timetable-slot-done" />}
                                            {canJoin && s.meetingLink ? (
                                                <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" title="Join link">Join</a>
                                            ) : !canJoin ? (
                                                <span className="timetable-join-locked" title="Enroll in this course to join the class">🔒</span>
                                            ) : null}
                                        </div>
                                    ))
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!canJoin && (
                <p className="timetable-note">🔒 Enroll in this course to join the live class.</p>
            )}

            {note && <p className="timetable-note">📌 {note}</p>}
        </div>
    );
};

export default ClassTimetable;
