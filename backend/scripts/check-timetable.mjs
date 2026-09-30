// Offline test for the PW-style weekly timetable logic (no DB, no network).
// Run: node scripts/check-timetable.mjs
import { buildWeeklyTimetable, buildUpcomingSessions } from '../../frontend/src/components/timetableLogic.js';

let pass = 0, fail = 0;
const check = (name, cond) => {
    if (cond) { pass++; console.log('  PASS ', name); }
    else { fail++; console.log('  FAIL ', name); }
};

// Ek fixed "now" lete hain: Wednesday 18:00
const now = new Date(2024, 0, 3, 18, 0); // Wed 3 Jan 2024
const schedule = [
    { label: 'Mon class', day: 'Monday', startTime: '09:00', endTime: '10:00', isLive: true },
    { label: 'Wed live', day: 'Wednesday', startTime: '17:00', endTime: '19:00', isLive: true, meetingLink: 'https://meet/x' },
    { label: 'Wed later', day: 'Wednesday', startTime: '20:00', endTime: '21:00', isLive: true },
    { label: 'Fri class', day: 'Friday', startTime: '14:00', endTime: '15:00', isLive: true }
];

console.log('== weekly grid');
const { week, totalSlots, todayName } = buildWeeklyTimetable(schedule, now);
check('all 7 days present', week.length === 7);
check('total slots counted', totalSlots === 4);
check('today detected as Wednesday', todayName === 'Wednesday');
check('Wednesday marked today', week.find(d => d.day === 'Wednesday').isToday === true);
check('only one day is today', week.filter(d => d.isToday).length === 1);
check('empty day has no slots', week.find(d => d.day === 'Tuesday').slots.length === 0);

console.log('\n== time formatting');
const wed = week.find(d => d.day === 'Wednesday');
check('17:00 shown as 5:00 PM', wed.slots[0].startPretty === '5:00 PM');
check('09:00 shown as 9:00 AM', week.find(d => d.day === 'Monday').slots[0].startPretty === '9:00 AM');
check('00:00 shown as 12:00 AM', buildWeeklyTimetable([{ day: 'Monday', startTime: '00:30', endTime: '01:00' }], now).week[0].slots[0].startPretty === '12:30 AM');

console.log('\n== live / ended status');
check('currently-running class is LIVE', wed.slots[0].status === 'live');
check('future class today is upcoming', wed.slots[1].status === 'upcoming');
// Weekly recurring schedule hai — Wednesday ko Monday ki class "ended" nahi,
// woh agli Wednesday tak upcoming rehti hai.
check('other-day class still upcoming (recurring)', week.find(d => d.day === 'Monday').slots[0].status === 'upcoming');
check('meeting link carried through', wed.slots[0].meetingLink === 'https://meet/x');

console.log('\n== sorted within a day');
const unsorted = buildWeeklyTimetable([
    { day: 'Monday', startTime: '15:00', endTime: '16:00' },
    { day: 'Monday', startTime: '09:00', endTime: '10:00' }
], now).week[0].slots;
check('slots sorted by start time', unsorted[0].startTime === '09:00' && unsorted[1].startTime === '15:00');

console.log('\n== upcoming sessions');
const up = buildUpcomingSessions(schedule, 4, now);
check('live class appears first', up[0].label === 'Wed live');
check('live class flagged isToday', up[0].isToday === true);
check('then next future class', up[1].label === 'Wed later');
check('respects limit', up.length <= 4);
check('weekly recurring: other-day classes still listed', up.some(s => s.label === 'Mon class'));
check('later days included', up.some(s => s.day === 'Friday'));

console.log('\n== empty schedule');
check('empty -> no slots', buildWeeklyTimetable([], now).totalSlots === 0);
check('empty -> no upcoming', buildUpcomingSessions([], 3, now).length === 0);

// 🔴 REGRESSION: aaj Sunday ho to Monday ka class "ended" nahi hona chahiye.
// Weekly grid Mon–Sun hai aur Sunday index 6 — pehle wrap-around nahi tha,
// isliye Monday (index 0) "pichla din" samajh aa raha tha.
console.log('\n== regression: Sunday (week wrap-around)');
const sunday = new Date(2024, 0, 7, 10, 0); // Sun 7 Jan 2024
const monClass = [{ label: 'Mon physics', day: 'Monday', startTime: '18:30', endTime: '20:00' }];
const sunTable = buildWeeklyTimetable(monClass, sunday);
check('Sunday detected as today', sunTable.todayName === 'Sunday');
check('Sunday column isToday', sunTable.week.find(d => d.day === 'Sunday').isToday === true);
check('Monday is NOT today', sunTable.week.find(d => d.day === 'Monday').isToday === false);
check('Monday class is upcoming, not ended', sunTable.week.find(d => d.day === 'Monday').slots[0].status === 'upcoming');
check('daysFromNow for Sunday = 0', sunTable.week.find(d => d.day === 'Sunday').daysFromNow === 0);
check('daysFromNow for Monday = 1', sunTable.week.find(d => d.day === 'Monday').daysFromNow === 1);
check('upcoming includes Monday class', buildUpcomingSessions(monClass, 3, sunday).some(s => s.day === 'Monday'));

// Aaj Monday hote hue bhi Thursday ki class upcoming rehni chahiye
const monday = new Date(2024, 0, 1, 10, 0); // Mon 1 Jan 2024
const multi = [
    { label: 'Mon', day: 'Monday', startTime: '18:30', endTime: '20:00' },
    { label: 'Thu', day: 'Thursday', startTime: '18:30', endTime: '20:00' },
    { label: 'Sat', day: 'Saturday', startTime: '11:00', endTime: '12:00' }
];
check('all future-week days upcoming', ['Thursday', 'Saturday']
    .every(day => buildWeeklyTimetable(multi, monday).week.find(d => d.day === day).slots[0].status === 'upcoming'));
check('past time today = ended', buildWeeklyTimetable(
    [{ label: 'X', day: 'Monday', startTime: '08:00', endTime: '09:00' }], monday
).week.find(d => d.day === 'Monday').slots[0].status === 'ended');
check('upcoming ordered by daysFromNow', (() => {
    const u = buildUpcomingSessions(multi, 5, monday);
    return u.length === 3 && u[0].label === 'Mon' && u[1].label === 'Thu' && u[2].label === 'Sat';
})());

console.log(`\n== RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
