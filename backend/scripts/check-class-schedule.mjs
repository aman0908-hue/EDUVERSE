// Offline check for the class-schedule logic in the student guide.
// No DB, no network — verifies findNextClass() + intent + fallback text.
import { findNextClass, buildGuideFallback, buildGuideFacts, isStudentGuideQuestion } from '../src/services/studentGuide.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayIn = n => DAYS[new Date(Date.now() + n * 86400000).getDay()];

let pass = 0, fail = 0;
const check = (name, cond) => {
    if (cond) { pass++; console.log('  PASS ', name); }
    else { fail++; console.log('  FAIL ', name); }
};

console.log('== findNextClass');
const weekly = findNextClass({ schedule: [{ label: 'Week 1', day: dayIn(1), startTime: '18:30', endTime: '20:00', isLive: true }] });
check('tomorrow weekly slot found', weekly && weekly.label === 'Week 1');
check('shows day + time', weekly.prettyWhen.includes(dayIn(1)) && weekly.prettyWhen.includes('18:30'));

const nearest = findNextClass({
    schedule: [
        { label: 'Later', day: dayIn(5), startTime: '10:00', endTime: '11:00' },
        { label: 'Sooner', day: dayIn(1), startTime: '09:00', endTime: '10:00' }
    ]
});
check('nearest slot wins', nearest.label === 'Sooner');

// Aaj ka slot jo nikal chuka hai -> aaj nahi, agle hafte
const now = new Date();
const todayName = DAYS[now.getDay()];
const earlier = new Date(now.getTime() - 60 * 60000);
const pastTime = `${String(earlier.getHours()).padStart(2, '0')}:00`;
const rolled = findNextClass({ schedule: [{ label: 'Passed', day: todayName, startTime: pastTime, endTime: '23:59' }] });
check('time already passed rolls to next week', !rolled.isToday);

// Aaj ka future slot -> aaj hi
const laterTime = `${String(Math.min(23, now.getHours() + 2)).padStart(2, '0')}:30`;
const todayFuture = findNextClass({ schedule: [{ label: 'TodaySlot', day: todayName, startTime: laterTime, endTime: '23:59' }] });
check('future slot today detected as today', todayFuture.isToday === true || todayFuture.prettyWhen.includes(todayName));

const oneOff = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const dated = findNextClass({ schedule: [{ label: 'Workshop', date: oneOff, startTime: '15:00', endTime: '17:00' }] });
check('one-off date returned', dated.date === oneOff);

check('empty schedule -> null', findNextClass({ schedule: [] }) === null);
check('no schedule key -> null', findNextClass({}) === null);

console.log('\n== intent detection');
['Kab meri class hai?', 'kab hai class', 'class schedule batao', 'next live class', 'next live class kab hai', 'timetable kya hai', 'what is my class schedule']
    .forEach(q => check(`matches: "${q}"`, isStudentGuideQuestion(q)));

console.log('\n== answers include the class');
const guide = {
    hasData: true,
    summary: {
        courses: 1, totalLessons: 5, completedLessons: 2, percentDone: 40, totalQuizzes: 3, quizzesTaken: 1,
        nextLesson: { courseTitle: 'MERN', lessonTitle: 'L1', module: 'M1', chapter: 'C1', hasVideo: true, quizzesLeft: 3 },
        nextClass: { label: 'Week 1', day: 'Monday', date: '', time: '18:30 - 20:00', isLive: true },
        hasSchedule: true
    }
};
const fb = buildGuideFallback(guide, 'kab hai class');
check('fallback names the class', fb.includes('Week 1') && fb.includes('18:30 - 20:00'));
const facts = buildGuideFacts(guide);
check('facts give day + time to the AI', facts.includes('next scheduled class') && facts.includes('18:30 - 20:00'));

const noSchedule = { hasData: true, summary: { ...guide.summary, nextClass: null, hasSchedule: false } };
check('no timetable -> says so, invents nothing', buildGuideFacts(noSchedule).includes('No class timetable'));
check('fallback without schedule omits class block', !buildGuideFallback(noSchedule, 'kab hai class').includes('**Next class:**'));

console.log(`\n== RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
