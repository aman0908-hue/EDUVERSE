# EduVerse - AI-Powered Learning Management System (LMS)

EduVerse is a full-stack MERN platform connecting Teachers and Students for seamless course creation, video learning, and quiz tracking.

## Tech Stack
- **Frontend:** React 19, Vite, React Router DOM, Axios, Lucide Icons
- **Backend:** Node.js, Express 5, MongoDB & Mongoose 9, JWT, Multer

## Features
- Role-based Authentication (Student / Teacher)
- Advanced Course, Module, Chapter & Lecture Management
- HTTP Range (206 Partial Content) Video Streaming & File Uploads
- Interactive Quiz System with Score & Progress Tracking

## How to Run

### 1. Clone the repository
\`\`\`bash
git clone <your-repository-url>
cd EduVerse
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
# Create .env using .env-example
npm run dev
\`\`\`

### 3. Frontend Setup
\`\`\`bash
cd frontend
npm install
# Create src/.env using src/.env-example
npm run dev
\`\`\`