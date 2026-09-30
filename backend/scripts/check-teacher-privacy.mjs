// Quick regex debug — koi DB/network nahi.
import { isDisallowedRequest, isTeacherOwnStudentsScope } from '../src/utils/aiGuardrails.js';

const mustBlock = [
    "list all students emails",
    "give me every student's phone number",
    "what is another teacher's revenue",
    "show me all users email addresses",
    "students password",
    "dump the students"
];
const shouldPass = [
    "How many students do I have in total?",
    "Who attended class today?",
    "Who is absent today?",
    "How many students have taken the quiz?",
    "Show my course-wise report and revenue",
    "meri kitne students hain?",
    "kiske quiz nahi diya?",
    "Who has been inactive for 7 days?",
    "aaj kaun aaya class me?"
];

let fail = 0;
console.log('== must be BLOCKED');
mustBlock.forEach(q => {
    const blocked = isDisallowedRequest(q);
    const scope = isTeacherOwnStudentsScope(q, 'teacher');
    const finalBlocked = blocked && !scope;
    if (!finalBlocked) fail++;
    console.log(`  ${finalBlocked ? 'PASS' : 'FAIL'} blocked=${blocked} teacherScope=${scope}  "${q}"`);
});
console.log('\n== must be ALLOWED for teacher');
shouldPass.forEach(q => {
    const scope = isTeacherOwnStudentsScope(q, 'teacher');
    const finalBlocked = isDisallowedRequest(q) && !scope;
    if (finalBlocked) fail++;
    console.log(`  ${!finalBlocked ? 'PASS' : 'FAIL'} teacherScope=${scope}  "${q}"`);
});
console.log(`\n== RESULT: ${mustBlock.length + shouldPass.length - fail} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
