// 🎓 Grades 5 se 12 tak + UG (undergraduate) + 'All' (sabko dikhega)
export const GRADES = ['5', '6', '7', '8', '9', '10', '11', '12', 'UG'];
export const GRADE_OPTIONS = [...GRADES, 'All'];

// 🌍 Language courses — teacher kaunsi language padhana chahta hai
export const COURSE_LANGUAGES = [
    'English', 'Hindi', 'Sanskrit', 'Marathi', 'Bengali',
    'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Malayalam',
    'Punjabi', 'Urdu', 'Spanish', 'French', 'German', 'Japanese'
];

// 📚 Course categories
export const CATEGORIES = [
    'Science', 'Mathematics', 'Social Science', 'English',
    'Computer', 'Language', 'Programming', 'Design',
    'Marketing', 'Business', 'Other'
];

// Shared timetable logic (generated from ScheduleEditor.jsx)

// Shared timetable logic — CourseDetail, EditCourse aur ClassTimetable sab yahi use karte hain.
// Plain .js rakha hai taaki backend ke node test bhi ise import kar sakein.

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };

export const toMinutes = time => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim());
    return match ? (Number(match[1]) * 60) + Number(match[2]) : null;
};

/** "18:30" ko "6:30 PM" jaisa friendly format me badalta hai. */
export const prettyTime = time => {
    const mins = toMinutes(time);
    if (mins === null) return time || '';
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

/**
 * Weekly timetable — Physics Wallah / Byju's jaisa grid.
 * Har din ke saath us din ke class slots, current time ke hisaab se
 * live / upcoming / ended status ke saath.
 */
export const buildWeeklyTimetable = (schedule = [], now = new Date()) => {
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    // DAYS[0] = Monday, JS getDay() Sunday=0 — map dobara banana padta hai
    const todayIndex = (now.getDay() + 6) % 7;
    const todayName = DAYS[todayIndex];

    const week = DAYS.map((day, dayIndex) => {
        // Weekly recurring schedule hai — isliye grid Mon–Sun order me hai,
        // par "aage/pichle" ka hisaab aaj se nikalna padta hai (wrap-around).
        // Bina iske Sunday ko aaj maankar Monday ko "pichla din" samajh lete the.
        const daysFromNow = (dayIndex - todayIndex + 7) % 7;
        const isToday = daysFromNow === 0;
        return {
        day,
        short: SHORT[day],
        isToday,
        daysFromNow,
        slots: (schedule || [])
            .filter(s => s && s.day === day)
            .sort((a, b) => (toMinutes(a.startTime) ?? 0) - (toMinutes(b.startTime) ?? 0))
            .map(slot => {
                const start = toMinutes(slot.startTime);
                const end = toMinutes(slot.endTime);
                const isLive = slot.isLive !== false;
                let status;
                if (!isToday) {
                    // Weekly slot — aage ke kisi bhi din ka class hoga hi
                    status = 'upcoming';
                } else if (start !== null && nowMinutes >= start && (end === null || nowMinutes < end)) {
                    status = isLive ? 'live' : 'ongoing';
                } else if (end !== null && nowMinutes >= end) {
                    status = 'ended';
                } else {
                    status = 'upcoming';
                }
                return {
                    label: slot.label || 'Class',
                    date: slot.date || '',
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    startPretty: prettyTime(slot.startTime),
                    endPretty: prettyTime(slot.endTime),
                    meetingLink: slot.meetingLink || '',
                    isLive,
                    status,
                    daysFromNow,
                    isToday
                };
            })
        };
    });

    const totalSlots = week.reduce((sum, d) => sum + d.slots.length, 0);
    return { week, totalSlots, todayName };
};

/** Aaj + aage ke upcoming slots — "aage kya hai" strip ke liye. */
export const buildUpcomingSessions = (schedule = [], limit = 5, now = new Date()) => {
    const { week } = buildWeeklyTimetable(schedule, now);
    const out = [];
    // Aaj se aage ke 7 din — grid ke order me nahi, aaj se ginke
    [...week]
        .sort((a, b) => a.daysFromNow - b.daysFromNow)
        .forEach(entry => {
            if (out.length >= limit) return;
            entry.slots
                .filter(s => s.status !== 'ended')
                .forEach(slot => {
                    if (out.length < limit) {
                        out.push({ ...slot, day: entry.day, shortDay: entry.short, dayOffset: entry.daysFromNow, isToday: entry.isToday });
                    }
                });
        });
    return out;
};
