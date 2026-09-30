// Offline demo — timetable code se seedha, AI/network ke bina.
// Ye dikhata hai ki timetable KAISE banta hai aur student ko kya dikhta hai.
// Run: node scripts/demo-timetable-only.mjs
import { buildWeeklyTimetable, buildUpcomingSessions } from '../../frontend/src/components/timetableLogic.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayIn = n => DAYS[new Date(Date.now() + n * 86400000).getDay()];

// Ye wahi data hai jo teacher ScheduleEditor se save karta hai
const schedule = [
    { label: 'Physics - Light and Reflection', day: dayIn(1), startTime: '18:30', endTime: '20:00', isLive: true, meetingLink: 'https://meet.google.com/phy' },
    { label: 'Chemistry - Reactions', day: dayIn(1), startTime: '20:15', endTime: '21:00', isLive: true, meetingLink: 'https://meet.google.com/chem' },
    { label: 'Biology - Cell Structure', day: dayIn(3), startTime: '18:30', endTime: '20:00', isLive: true, meetingLink: 'https://meet.google.com/bio' },
    { label: 'Doubt Session', day: dayIn(5), startTime: '11:00', endTime: '12:00', isLive: true, meetingLink: 'https://meet.google.com/doubt' }
];
const note = 'Doubt session har Saturday. Recorded lectures raat ko 9 baje.';

const line = t => console.log('\n' + '─'.repeat(66) + '\n' + t + '\n' + '─'.repeat(66));

line('1) TEACHER ne ye data diya (ScheduleEditor se)');
schedule.forEach(s => console.log('   ' + s.day.padEnd(10) + s.startTime + '-' + s.endTime + '   ' + s.label));
console.log('   Note: ' + note);

const { week, totalSlots, todayName } = buildWeeklyTimetable(schedule);
const upcoming = buildUpcomingSessions(schedule, 4);

line('2) STUDENT KO YE DIKHTA HAI — hero card');
const live = week.flatMap(d => d.slots).find(s => s.status === 'live');
const next = upcoming[0];
if (live) {
    console.log('   [LIVE NOW]  ' + live.label);
    console.log('               ' + live.startPretty + ' - ' + live.endPretty);
    console.log('               Join: ' + (live.meetingLink || 'no link'));
} else {
    console.log('   [NEXT CLASS]  ' + next.label);
    console.log('               ' + (next.isToday ? 'Today' : next.shortDay) + ' | ' + next.startPretty + ' - ' + next.endPretty);
    console.log('               Join: ' + (next.meetingLink || 'no link'));
}
console.log('\n   Aage ke classes:');
upcoming.forEach(s => console.log('     ' + (s.isToday ? 'TODAY' : s.shortDay.padEnd(5)) + '  ' + s.startPretty.padEnd(9) + '  ' + s.label));

line('3) POORA WEEK GRID (aaj = ' + todayName + ', ' + totalSlots + ' classes)');
week.forEach(d => {
    const mark = d.isToday ? ' <- TODAY' : '';
    console.log('\n   ' + d.day.toUpperCase() + mark);
    if (!d.slots.length) { console.log('      (no class)'); return; }
    d.slots.forEach(s => {
        const tag = s.status === 'live' ? '[LIVE]' : s.status === 'ended' ? '[done]' : '      ';
        console.log('      ' + tag + ' ' + s.startPretty + ' - ' + s.endPretty + '  ' + s.label);
    });
});
console.log('\n   Note: ' + note);
console.log('\nDONE — AI call kiye bina, pure timetable logic.');
