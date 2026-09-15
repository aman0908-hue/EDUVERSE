# EduVerse — AI-Powered Learning Management System (LMS)

EduVerse is a full-stack **MERN** platform connecting **Teachers** and **Students** — structured courses (Modules → Chapters → Lectures), chunked video streaming (HTTP Range / 206), study materials, quizzes, and progress tracking dashboards.

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
EduVerse/
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

**Courses**: `POST /course/create` → `/courses/create` · `PUT /course/update` → `/courses/update` · `GET /course/all` → `/courses/all` (filter+paginate) · `GET /courses/:id` · `DELETE /courses/:courseId` · `GET /course/teacher-courses/:teacherId` → `/courses/teacher-courses/:id` · `GET /course/teacher-dashboard/:teacherId` → `/courses/teacher-dashboard/:id` · `GET /course/student-join-courses/:studentId` → `/courses/student-join-courses/:id` · `GET /course/is-student-joined/:courseId` → `/courses/is-student-joined/:id`

**Structure**: `POST/PUT/DELETE /modules/` · `GET /modules/:courseId` · `GET /modules/single-module/:id` · `POST/PUT/DELETE /chapters/` · `GET /chapters/:moduleId` · `GET /chapters/single/:id` · `POST/PUT/DELETE /lectures/` (= `/lessons/`) · `POST /lectures/materials` · `GET /lectures/all/:chapterId` · `GET /lectures/:lectureId` · `GET /lectures/video/stream/:lectureId` (**Range/206**)

**Quizzes / Enrollment / Progress**: `POST /quizes/create` → `/quizzes/create` · `PUT/DELETE /quizzes/:id` · `POST /quizzes/submit` · `GET /quizzes/status/:lessonId?studentId=` · `POST /enrollement/join` (= `/enrollment/join`, also `/courses/enroll`) · `GET /enrollment/is-joined/:courseId` · `POST /progress/mark-complete` · `POST /progress/mark-incomplete` · `POST /progress/submit-quiz` · `GET /progress/quiz-progress/:studentId/:courseId` · `GET /progress/dashboard/student/:studentId`

**Health**: `GET /health` · `GET /api/v1/health`

## How to Run

### Prerequisites
- Node.js v18+, MongoDB running on `localhost:27017`

### 1. Backend
```bash
cd backend
npm install
cp .env-example .env          # PORT, MONGO_URL, JWT_SECRET, FRONTEND_URL...
npm run dev                   # → http://localhost:4000
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
