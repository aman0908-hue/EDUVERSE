# ATs Learning — AI-Powered Learning Management System (LMS)

ATs Learning is a full-stack **MERN** platform connecting **Teachers** and **Students** — structured courses (Modules → Chapters → Lectures), chunked video streaming (HTTP Range / 206), study materials, quizzes, and progress tracking dashboards.

## Tech Stack
| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, React Router DOM 7, Axios, lucide-react / react-icons, react-hot-toast |
| Backend | Node.js (v18+), Express 5, MongoDB + Mongoose 9, JWT + bcrypt, Multer, cookie-parser, cors, dotenv, nodemon |

## Features
- **Auth**: Register (Student/Teacher, profile image upload), Login/Logout with httpOnly JWT cookies (7-day), session restore via `GET /auth/me`, role-based access
- **Teacher**: Create/update/delete courses (thumbnail + trailer upload, category, level, language, requirements, outcomes), manage modules → chapters → lectures (video upload / YouTube URL / notes / attachments), quiz builder per lecture, student analytics
- **Student**: Browse courses with filters (category/language/level) + pagination, course details + enroll, watch lectures (206 chunked streaming), download materials, attempt quizzes, mark lectures complete/incomplete, progress dashboard (%, quiz scores)
- **Security**: `authMiddleware` (JWT), `teacherProtectedMiddleware` (role), `isCourseJoinedMiddleware` (enrollment-protected streaming), centralized `errorMiddleware`, `asyncHandler`

## Project Structure
```
AmanTech-Learning/
├── backend/
│   ├── src/
│   │   ├── server.js            # Express app + routes
│   │   ├── config/db.js         # MongoDB connection
│   │   ├── models/              # User, Course, Module, Chapter, Lesson, Quiz, Enrollment, Progress
│   │   ├── routes/              # auth, course, module, chapter, lesson, quiz, enrollment, progress
│   │   ├── controllers/         # MVC controllers
│   │   ├── middlewares/         # auth, error, asyncHandler
│   │   ├── handlers/            # asyncHandler
│   │   └── utils/upload.js      # Multer configs (profile/course/lesson/material uploads)
│   ├── uploads/                 # Uploaded media (served statically)
│   └── .env-example
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Routes + role guards
│   │   ├── context/UserContext.jsx   # Session via /auth/me
│   │   ├── utils/api.js         # Axios instance (withCredentials)
│   │   ├── layouts/             # StudentLayout, TeacherLayout
│   │   ├── components/          # Header, Footer, CourseCard, QuizBuilder
│   │   └── pages/               # Home, Login, Register, Courses, CourseDetail,
│   │                            # TeacherDashboard, CreateCourse, EditCourse,
│   │                            # StudentDashboard, LearningPage
│   └── src/.env-example
└── README.md
```

## API Endpoints (prefix `/api/v1/`)
**Auth**: `POST /auth/register` (multipart w/ profileImage) · `POST /auth/login` · `POST /auth/logout` · `GET /auth/me`

**Admin (full-detail control center — admin ke paas poora data)**:
- `GET /admin/dashboard` · `GET /admin/analytics`
- `GET /admin/overview` — users/teachers/students/courses/content/enrollments/revenue counts, category split, top courses, latest enrollments
- `GET /admin/reports/teachers?search=` — har teacher ke courses (modules/chapters/lectures/quizzes), enrolled students, unki learning activity, revenue
- `GET /admin/reports/students?search=` — har student ke enrolled courses, per-course progress %, completed lectures, quiz attempts + scores, avg score, last activity
- `GET /admin/reports/courses?search=` — har course ka content count, teacher, price, revenue aur enrolled students ki list
- `GET /admin/reports/enrollments?search=&courseId=&studentId=` — flat enrollment record (student, course, teacher, date)
- `GET /admin/reports/activity` — latest 20 events (signup / enrollment / course / lecture)
- `GET /admin/reports/users/:userId` — single user ka poora record
- `GET /admin/reports/cleanup` — hidden data count: draft courses, orphan enrollments, orphan content
- `POST /admin/reports/cleanup/purge` — permanently remove all orphan (deleted) records
- `DELETE /admin/reports/cleanup/draft/:courseId` — permanently delete one draft course (published courses are protected)
- `GET /admin/users` · `POST /admin/teachers` · `PATCH /admin/users/:userId/access` · `PATCH /admin/users/:userId/role` · `GET /admin/teacher-requests` · `PATCH /admin/teacher-requests/:requestId`

- `GET /admin/ai-settings` · `PUT /admin/ai-settings` · `POST /admin/ai-settings/test` — set / test / remove the AI API key from the **Admin Console → AI Settings** tab

**AI Settings (no .env editing needed)**: an admin can pick a provider (Built-in Study Guide, OpenAI, OpenRouter, Groq, Gemini, or any OpenAI-compatible endpoint), paste the API key and press **Save**. The key is stored **encrypted** (AES-256-GCM, derived from `JWT_SECRET`) in MongoDB and is never returned by any endpoint — only a masked hint like `sk-te...fXYZ`. `Test Connection` makes a real API call to verify the key before saving. Priority order: **Admin Console setting → `.env` variable → built-in offline study guide**. Changing the provider takes effect immediately (no restart).

**Student Guide** (`services/studentGuide.js`): students can ask the assistant about *their own* learning — "what is my next lecture?", "which quiz is pending?", "how much have I completed?". `buildStudentGuide()` reads the student's published enrollments, ordered modules → chapters → lectures, quiz counts and `Progress` records, then produces both a deterministic answer and a compact fact sheet. Facts are computed **in code** and the model is only asked to reformat them, so the numbers can never be wrong; if the model still refuses (it sometimes mistakes a student's own progress for "personal data"), the accurate code-built answer is returned instead. Only published courses with active instructors are included, and each answer carries a `guide` summary. Note: teachers set the real class timetable on the course itself (`schedule` array: day, start/end time, optional one-off date, live/recorded flag, meeting link). `findNextClass()` picks the nearest slot **after the current time**, so "kab hai meri class?" and "next class" now return an actual day and time; "next lecture" remains a separate concept (the first unfinished lecture in course order). If no teacher has set a timetable the assistant says so — it never invents a time or date.

**Grade / Class targeting (5–12, UG, All)**: `Course.grade` and `User.grade` both hold one of `5…12, UG, All`. A student who registers as **UG** only sees UG courses (plus `All` ones) — useful for college-level batches. Language courses get an extra `Course.courseLanguage` field (English, Hindi, Sanskrit, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Spanish, French, German, Japanese); the "Which language?" dropdown only appears when the category is `Language`. Teachers also pick multi-select class chips at registration, stored in `User.teachesGrades`. When a student registers they choose their class, courses show a `🎓 Class N` / `UG (College)` badge and a `🗣️ Language` badge. Verified with `node scripts/check-grade-filter.mjs`.

**Theme (dark / light)**: `context/ThemeContext.jsx` stores the choice in `localStorage` and falls back to `prefers-color-scheme` on first visit. `App.jsx` wraps everything in `<ThemeProvider>` and `Header.jsx` has a ☀️/🌙 toggle. `index.css` defines light variables on `:root` and dark ones on `[data-theme="dark"]` (surfaces, inputs, borders, shadows) plus `!important` overrides for the handful of components that use hardcoded inline light colours.

**Demo data / reset**: `node scripts/reset-and-seed-demo.mjs` wipes all nine content collections (after writing a JSON backup to `backend/backups/`), then seeds exactly one admin, one teacher and one student (Class 10) plus a published course with a weekly timetable, one module → chapter → 3 lessons, an enrolment and some progress. `aisettings` is deliberately **preserved** so the admin's encrypted AI key is not lost. Accounts: `admin@demo.test`, `teacher@demo.test`, `student@demo.test`, all with password `Demo@12345`.

**Grade / Class targeting (KG–12)**: `Course.grade` and `User.grade` both hold one of `KG, LKG, UKG, 1…12, All`. When a teacher creates a course they pick the class it is for; a logged-in **student** only ever sees courses matching their own grade plus the `All` ones — `getAllCourses()` adds `query.grade = { $in: [req.user.grade, 'All'] }`. Public browsing still shows everything, and teachers/admins can filter explicitly with `?grade=10`. Because `/courses/all` is public, the route uses a new `optionalAuth` middleware (sets `req.user` when a token exists, never rejects). Students choose their class at registration, courses show a `🎓 Class N` badge, and registration defaults to Class 10. Verified with `node scripts/check-grade-filter.mjs` (10 assertions: a Class 10 student never sees a Class 12 course, `All` courses reach everyone, public browse is unfiltered, teacher `?grade=` works).

**Class Timetable (PW/Byju's style)**: teachers set a weekly timetable on the course (`schedule[]` with day, start/end time, live flag, meeting link). A dedicated **Class Timetable** tab in course management holds the editor plus a **Student Preview**, and students see `ClassTimetable` on the course page: a hero card (red pulsing **LIVE NOW** with a join button, otherwise the **NEXT CLASS** with day/time), an upcoming-classes strip, and a 7-day grid with today highlighted, friendly 12-hour times, and live/upcoming/ended status. The shared logic lives in `frontend/src/components/timetableLogic.js` so the editor, student view and the node test all use the same code. Verified with `node scripts/check-timetable.mjs` (22 assertions: day mapping, 12-hour formatting, live/ended detection, sorting, upcoming order).

**Scaling**: `Progress` and `Enrollment` carry indexes (`courseId+updatedAt`, `studentId+courseId`, `quizAttempts.attemptedAt`, `course`, `student`, and a unique `student+course` to prevent duplicate enrolments) so the teacher analytics and attendance queries stay fast as the student base grows. `Progress.quizAttempts.attemptedAt` is recorded on every attempt, which is what powers "who attempted a quiz today".

**Teacher Assistant** (`services/teacherGuide.js`): teachers get their **own** coaching analytics — total enrolled students, who was active today and who was not, who attempted a quiz, average score, 7-day inactivity, course-wise content counts and revenue. `collectTeacherData()` queries only courses where `instructor` **is the logged-in teacher**, so another teacher's students can never leak in. Facts are computed in code and the model only reformats them, so counts and names are always accurate; if the model refuses (it often calls analytics "personal data"), the code-built answer is returned instead. Questions are matched by `isTeacherGuideQuestion()` (English + Hindi). Since the platform has no attendance table, "present today" means the student's `Progress` record was updated today or a quiz attempt was made today. Contact data is never included — a separate `sanitizeTeacherOutput()` strips any email the model might add.

Privacy is a two-layer gate: `isTeacherOwnStudentsScope()` lets a teacher ask about *their own* students, but `NEVER_IN_TEACHER_SCOPE` permanently blocks emails, phones, passwords, addresses, "all students", and any other teacher's data. Verified with `node scripts/check-teacher-guide.mjs` (temp teacher + 3 students, then rolls back) and `node scripts/check-teacher-privacy.mjs` (15 offline scope/privacy assertions).

Verified with `node scripts/check-student-guide.mjs` (creates a temp student, temporarily publishes a course, tests, then rolls everything back) and `node scripts/check-class-schedule.mjs` (offline: verifies next-class selection, past-time rollover, one-off dates, intent matching, and that a missing timetable is reported honestly instead of invented).
**AI Guardrails** (`utils/aiGuardrails.js`): both AI endpoints are grounded and locked down.
1. **Grounded** — the model is instructed to answer only from the lesson notes / course material passed to it, and to reply *"This is not covered in your lesson material."* instead of inventing content.
2. **Privacy** — the system prompt forbids revealing any other student / teacher / admin's name, email, phone, marks or account details, and a post-processing sanitizer strips any email / phone numbers that slip into an answer.
3. **Safety** — requests for illegal activity, weapons/drugs, hacking, exam cheating or answer keys, self-harm, or 2000+ character dumps are refused before the model is even called (`mode: "refused"`).
4. **Output** — the model is told never to claim it watched a video without a transcript, and never to reveal its own instructions.

Verified with `node scripts/check-ai-guardrails.mjs` — 17/17 cases pass (12 refusals + 5 normal study questions allowed).

**Reliability** (`callChatCompletion` in `config/aiConfig.js`): every AI call retries twice on transient errors (429 / 500 / 503) and, for Gemini, automatically falls back through `gemini-flash-latest → gemini-3.5-flash → gemini-3.5-flash-lite → gemini-2.5-flash-lite` if a model is retired or overloaded. Gemini 3.x "thinking" tokens consume the budget, so the token limit is tripled for that provider. Error messages tell the user (and the admin) what actually went wrong instead of a generic "temporarily unavailable".

**Admin data rules**: all report endpoints return clean data only — draft courses (`isPublished: false`) and orphan records (deleted student/course) are filtered out. Hidden data is listed in `stats.hidden` and managed from the **Drafts & Cleanup** tab.


**Courses**: `POST /course/create` → `/courses/create` · `PUT /course/update` → `/courses/update` · `GET /course/all` → `/courses/all` (filter+paginate) · `GET /courses/:id` · `DELETE /courses/:courseId` · `GET /course/teacher-courses/:teacherId` → `/courses/teacher-courses/:id` · `GET /course/teacher-dashboard/:teacherId` → `/courses/teacher-dashboard/:id` · `GET /course/student-join-courses/:studentId` → `/courses/student-join-courses/:id` · `GET /course/is-student-joined/:courseId` → `/courses/is-student-joined/:id`

**Structure**: `POST/PUT/DELETE /modules/` · `GET /modules/:courseId` · `GET /modules/single-module/:id` · `POST/PUT/DELETE /chapters/` · `GET /chapters/:moduleId` · `GET /chapters/single/:id` · `POST/PUT/DELETE /lectures/` (= `/lessons/`) · `POST /lectures/materials` · `GET /lectures/all/:chapterId` · `GET /lectures/:lectureId` · `GET /lectures/video/stream/:lectureId` (**Range/206**)

**Quizzes / Enrollment / Progress**: `POST /quizes/create` → `/quizzes/create` · `PUT/DELETE /quizzes/:id` · `POST /quizzes/submit` · `GET /quizzes/status/:lessonId?studentId=` · `POST /enrollement/join` (= `/enrollment/join`, also `/courses/enroll`) · `GET /enrollment/is-joined/:courseId` · `POST /progress/mark-complete` · `POST /progress/mark-incomplete` · `POST /progress/submit-quiz` · `GET /progress/quiz-progress/:studentId/:courseId` · `GET /progress/dashboard/student/:studentId`

**Health**: `GET /health` · `GET /api/v1/health`

## How to Run

### Prerequisites
- Node.js v18+ — **local MongoDB ki zaroorat NAHI hai**, cloud MongoDB Atlas use hota hai
- Ek MongoDB Atlas cluster + uska `MONGO_URL` (`.env` me already set hai)
- **Zaroori:** apne current IP ko Atlas me whitelist karo → [cloud.mongodb.com](https://cloud.mongodb.com) → apna project → **Security → Network Access → ADD IP ADDRESS → "Allow Access From Anywhere"** (0.0.0.0/0). Iske bina TLS handshake pe hi connection reject ho jata hai.

### 1. Backend
```bash
cd backend
npm install
cp .env-example .env          # PORT, MONGO_URL, JWT_SECRET, FRONTEND_URL...
npm run dev                   # → http://localhost:4000 (MongoDB Atlas cloud)
```

### 2. Frontend
```bash
cd frontend
npm install
cp src/.env-example src/.env  # VITE_API_URL=http://localhost:4000
npm run dev                   # → http://localhost:5173
```

Open **http://localhost:5173** — register as Teacher (create courses) or Student (enroll & learn).

## Testing Video Streaming (206)
```bash
curl -i -H "Range: bytes=0-999999" --cookie "token=<jwt>" \
  http://localhost:4000/api/v1/lessons/video/stream/<lectureId>
# → HTTP/1.1 206 Partial Content  +  Content-Range header
```

## Evaluation Checklist
- ✅ End-to-end flows (create → enroll → watch → quiz → progress)
- ✅ MVC structure, commented code
- ✅ JWT auth + role-protected + enrollment-protected routes
- ✅ Multer uploads (images, videos, PDFs, code files) + 206 streaming
- ✅ Filters, pagination, responsive UI, error handling
