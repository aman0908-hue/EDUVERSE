#!/usr/bin/env python3
"""
Generate "ATS Learning - AI-Powered LMS" synopsis / project report PDF.
Structure mirrors the reference report: cover, abstract, index, introduction,
objective, significance, key features, ER diagram, benefits, implementation,
challenges, future scope, screenshots.
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph,
                                Spacer, PageBreak, Table, TableStyle)
from reportlab.graphics.shapes import Drawing, Rect, String, Line
import os

OUT = os.path.expanduser("~/Desktop/ATS Learning - Synopsis.pdf")

ACCENT = colors.HexColor("#1F4E79")
LIGHT = colors.HexColor("#EAF1F8")
GREY = colors.HexColor("#444444")


def S(name, **kw):
    base = dict(name=name, fontName="Helvetica", fontSize=11, leading=17,
                textColor=colors.black, alignment=TA_JUSTIFY, spaceAfter=10)
    base.update(kw)
    return ParagraphStyle(**base)


st_title = S("t", fontName="Helvetica-Bold", fontSize=26, leading=32,
             alignment=TA_CENTER, textColor=ACCENT, spaceAfter=6)
st_sub = S("s", fontSize=14, leading=20, alignment=TA_CENTER,
           textColor=GREY, spaceAfter=18)
st_h1 = S("h1", fontName="Helvetica-Bold", fontSize=17, leading=22,
          alignment=TA_CENTER, textColor=ACCENT, spaceBefore=6, spaceAfter=14)
st_h2 = S("h2", fontName="Helvetica-Bold", fontSize=12.5, leading=17,
          alignment=TA_LEFT, textColor=ACCENT, spaceBefore=12, spaceAfter=6)
st_body = S("b")
st_num = S("n", fontName="Helvetica-Bold", fontSize=11.5, leading=17,
           spaceBefore=9, spaceAfter=4, alignment=TA_LEFT)
st_bullet = S("bu", leftIndent=14, bulletIndent=4, spaceAfter=6)
st_cover = S("c", alignment=TA_CENTER, fontSize=13, leading=20, textColor=GREY)
st_coverb = S("cb", alignment=TA_CENTER, fontName="Helvetica-Bold", fontSize=14,
             leading=22, textColor=colors.black)
st_cell = S("cell", fontSize=10.5, leading=15, alignment=TA_LEFT, spaceAfter=0)

story = []


def P(t, s=st_body):
    story.append(Paragraph(t, s))


def SP(h=10):
    story.append(Spacer(1, h))


def PB():
    story.append(PageBreak())


def BUL(items):
    for it in items:
        story.append(Paragraph(it, st_bullet, bulletText="\u2022"))


def NUM(n, head, body):
    story.append(Paragraph(f"{n}. {head}", st_num))
    story.append(Paragraph(body, st_body))


def draw_frame(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(GREY)
    canvas.drawRightString(A4[0] - 20 * mm, A4[1] - 14 * mm, str(doc.page))
    canvas.setStrokeColor(colors.HexColor("#BBBBBB"))
    canvas.setLineWidth(0.5)
    canvas.line(20 * mm, A4[1] - 16 * mm, A4[0] - 20 * mm, A4[1] - 16 * mm)
    canvas.restoreState()


def draw_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ACCENT)
    canvas.rect(0, A4[1] - 45 * mm, A4[0], 45 * mm, stroke=0, fill=1)
    canvas.rect(0, 0, A4[0], 12 * mm, stroke=0, fill=1)
    canvas.restoreState()


doc = BaseDocTemplate(
    OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
    topMargin=22 * mm, bottomMargin=18 * mm,
    title="ATS Learning - AI-Powered Learning Management System")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="n")
coverf = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="c")
doc.addPageTemplates([
    PageTemplate(id="Cover", frames=[coverf], onPage=draw_cover),
    PageTemplate(id="Body", frames=[frame], onPage=draw_frame),
])
# ============================================================ 1. COVER PAGE
SP(52)
P("Summer Training Project", st_cover)
P("Project Report", st_cover)
P("2026", st_cover)
SP(6)
P("ATS LEARNING", st_title)
P("AI-POWERED LEARNING MANAGEMENT SYSTEM", st_sub)
SP(2)
P("Web-Based Platform for Course Creation, Content Delivery,<br/>Assessment and AI-Guided Learning", st_sub)
SP(44)
sig = Table([[
    [Paragraph("Supervised By:", st_coverb),
     Paragraph("Mr. [Supervisor Name]<br/>[Designation]<br/>[Institute / Company]", st_cover)],
    "",
    [Paragraph("Submitted By:", st_coverb),
     Paragraph("[Your Full Name]<br/>[Course / Branch]<br/>[Roll No.]", st_cover)],
]], colWidths=[doc.width / 2 - 6, 12, doc.width / 2 - 6])
sig.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 0),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
]))
story.append(sig)
PB()

# ============================================================ 2. ABSTRACT
P("ABSTRACT", st_h1)
P("The ATS Learning Management System is a full-stack web application developed to "
  "digitise the complete lifecycle of online education &mdash; from course creation by a "
  "teacher to course completion and assessment by a student. The system connects two "
  "distinct user groups, Teachers and Students, through a structured content hierarchy "
  "of Courses, Modules, Chapters and Lectures, supported by study materials, quizzes and "
  "progress tracking.")
P("A course created by a teacher carries a thumbnail, a trailer video, a category, a level, "
  "a teaching language, a price and a target grade. Inside it, the teacher arranges Modules, "
  "which further contain Chapters and Lectures, where each Lecture may hold an uploaded "
  "video, a YouTube link, a live class link with a scheduled time, textual theory content, "
  "downloadable attachments and multiple study materials. Quizzes are built either per "
  "lecture as a topic test or at course level as a final examination.")
P("The platform integrates artificial intelligence at several levels. A general AI Assistant "
  "answers common queries, a Study Assistant restricted to enrolled courses explains topics "
  "using only the lesson material supplied to it, and two personalised assistants &mdash; a "
  "Student Guide and a Teacher Guide &mdash; answer questions about the learner&rsquo;s own "
  "progress and the teacher&rsquo;s own class performance. All AI answers are grounded, "
  "privacy-filtered and guarded against unsafe requests.")
P("The system is developed using the MERN stack &mdash; React 19 with Vite on the frontend, "
  "Node.js with Express 5 on the backend, and MongoDB Atlas with Mongoose as the database. "
  "Authentication uses JSON Web Tokens stored in httpOnly cookies with bcrypt password "
  "hashing, and role-based middlewares separate student, teacher and admin access. Video "
  "lectures are streamed using HTTP Range requests so large files play smoothly without "
  "being downloaded entirely. The application is deployed on Vercel through a serverless "
  "backend entry point.")
P("The project replaces fragmented, repetitive teaching work with a single organised digital "
  "platform, improving content quality, student engagement and measurable learning outcomes "
  "while reducing the administrative load on both teachers and institutions.")
PB()

# ============================================================ 3. INDEX
P("INDEX", st_h1)
rows = [
    ("1", "Cover Page", "1"),
    ("2", "Abstract", "2"),
    ("3", "Introduction", "3"),
    ("4", "Objective", "4"),
    ("5", "Significance", "5"),
    ("6", "Key Features", "6-8"),
    ("7", "ER Diagram", "9"),
    ("8", "Benefits", "10-11"),
    ("9", "Implementation", "12-13"),
    ("10", "Challenges Faced", "14-15"),
    ("11", "Future Scope", "16"),
    ("12", "Screenshots", "17"),
]
data = [[Paragraph(f"<b>{a}</b>", st_cell), Paragraph(f"<b>{b}</b>", st_cell),
         Paragraph(f"<b>{c}</b>", st_cell)] for a, b, c in rows]
tbl = Table(data, colWidths=[22 * mm, doc.width - 60 * mm, 38 * mm], hAlign="CENTER")
tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ("ALIGN", (2, 0), (2, -1), "CENTER"),
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
]))
story.append(tbl)
PB()
# ============================================================ 4. INTRODUCTION
P("INTRODUCTION", st_h1)
P("Education is the foundation on which every organisation progresses, but the traditional "
  "classroom model faces serious limitations when it comes to scale, consistency and "
  "measurement. Physical classrooms restrict the number of learners a teacher can reach, "
  "learning material is often limited to a single textbook or a handwritten notebook, and "
  "there is no reliable mechanism to record who has actually understood what was taught. "
  "When instruction moves online without a proper platform, the problem simply shifts: "
  "content is scattered across drives and messaging groups, attendance is maintained manually, "
  "and neither the teacher nor the student can see a true picture of learning progress.")
P("The ATS Learning Management System has been developed to address exactly this gap. It is "
  "a web-based platform that connects Teachers and Students within a single digital "
  "ecosystem. A teacher can create a course, organise its content into a structured sequence "
  "of modules, chapters and lectures, attach videos, documents and study material, and build "
  "quizzes to assess understanding. A student can register, browse courses matched to their "
  "class and language, enrol, watch lectures, download material, attempt quizzes and watch "
  "their completion percentage rise in real time.")
P("The system was designed with four goals in mind. First, structure &mdash; content must "
  "follow a logical hierarchy so that a learner always knows what comes next. Second, access "
  "control &mdash; students should see only the courses meant for their grade, and a teacher "
  "should see only their own students. Third, measurement &mdash; every lecture completion, "
  "quiz score and inactivity gap must be recorded so that progress becomes visible rather than "
  "assumed. Fourth, intelligence &mdash; a learning management system should be able to answer "
  "the routine questions a student or teacher asks every day, without delay.")
P("To achieve this, the platform integrates artificial intelligence in a grounded and "
  "controlled manner. The AI layer is not permitted to invent content. It answers only from "
  "the lesson material and platform records supplied to it, refuses unsafe requests, and is "
  "prevented from exposing any student&rsquo;s or teacher&rsquo;s personal data. In this way, "
  "AI adds convenience without compromising accuracy or privacy.")
P("The technology stack was selected for reliability and maintainability. React provides a "
  "responsive, component-based user interface; Express handles the API layer; MongoDB stores "
  "the content and analytics data in a flexible document model; and JSON Web Tokens secure "
  "the session. The entire application is deployed on Vercel, which allows the project to run "
  "as a live, publicly accessible website rather than remaining a local demonstration.")
PB()

# ============================================================ 5. OBJECTIVE
P("OBJECTIVE", st_h1)
P("The primary objective of the ATS Learning Management System is to build a reliable, "
  "secure and user-friendly platform that manages the entire course delivery lifecycle for an "
  "educational institution. The system aims to replace manual, repetitive teaching "
  "administrative work with an organised digital process that improves both the quality of "
  "instruction and the measurability of learning.")
P("The specific objectives of the project are listed below.")
BUL([
    "To design and develop a full-stack web application that connects Teachers and Students "
    "through a single shared platform.",
    "To model course content hierarchically as Course, Module, Chapter and Lecture so that "
    "learning material is always organised in a logical sequence.",
    "To support multiple content formats within a single lecture, including uploaded videos, "
    "YouTube links, live class links, textual theory, attachments and downloadable study "
    "materials.",
    "To implement a secure authentication and authorisation system using password hashing, "
    "JSON Web Tokens and role-based access control for students, teachers and administrators.",
    "To allow a teacher to create, update and publish courses with a thumbnail, trailer video, "
    "category, level, language, price, requirements and learning outcomes.",
    "To introduce grade-based targeting so that a student automatically sees only the courses "
    "relevant to their class, from grade 5 to 12 and undergraduate level.",
    "To build a quiz system that supports both per-lecture topic quizzes and course-level final "
    "examinations, with automatic scoring.",
    "To record every learning action &mdash; lecture completion, quiz attempts and scores "
    "&mdash; so that student progress can be displayed as a clear percentage.",
    "To develop distinct dashboards for students, teachers and administrators showing the "
    "information most relevant to each role.",
    "To integrate a grounded AI assistant that answers study questions using only the lesson "
    "material, and refuses to answer anything it has not been given.",
    "To develop a personalised AI Student Guide and AI Teacher Guide that answer questions about "
    "the user&rsquo;s own progress and class performance using data computed directly in code.",
    "To protect user privacy by encrypting stored AI API keys and filtering personal data out "
    "of every AI response.",
    "To handle large video lectures efficiently using HTTP Range requests for smooth chunked "
    "streaming.",
    "To deploy the application on a cloud hosting platform so that it remains publicly "
    "accessible and demonstrable.",
])
PB()
# ============================================================ 6. SIGNIFICANCE
P("SIGNIFICANCE", st_h1)
P("The significance of the project lies in the fact that it addresses a genuine and recurring "
  "problem in educational institutions: the absence of a single, dependable record of what is "
  "taught, who has learnt it, and where the gaps are. Without such a record, teaching quality "
  "cannot be measured, and student performance is largely assumed rather than known.")
P("For the teaching community, the system converts content preparation into a reusable asset. "
  "A lecture recorded once &mdash; with its video, notes and materials &mdash; can be revisited "
  "by any number of students in later batches, including those who missed it or need extra "
  "revision. Quizzes attached to each lecture give the teacher an immediate and objective "
  "indication of whether the class has understood the topic, which allows weak areas to be "
  "re-taught before the syllabus moves forward.")
P("For students, the benefit is continuity and accessibility. Course content is no longer "
  "limited by attendance, timing or location. Because the system records progress "
  "automatically, a student always knows exactly how far they have come and what remains. The "
  "AI layer adds a further advantage: routine questions such as &ldquo;what is my next "
  "lecture&rdquo; or &ldquo;which quiz is pending&rdquo; can be answered instantly at any hour, "
  "which is especially helpful for self-study and revision outside classroom hours.")
P("For administrators, the platform provides consolidated visibility. Reports on teachers, "
  "students, courses, enrolments and recent activity are available from a single control "
  "centre, along with the ability to manage user roles, approve teacher requests and remove "
  "obsolete data. This supports informed decision-making rather than guesswork.")
P("At an institutional level, the project contributes to digital transformation. By replacing "
  "registers, spreadsheets and scattered files with a structured digital platform, the "
  "institution reduces paperwork, improves transparency and builds a data foundation that can "
  "later support fee management, certification and full reporting. Overall, the project "
  "supports a more organised, measurable and student-friendly approach to education.")
PB()

# ============================================================ 7. KEY FEATURES
P("KEY FEATURES", st_h1)
P("The ATS Learning Management System provides a wide range of features covering "
  "authentication, course authoring, content delivery, assessment, analytics, artificial "
  "intelligence and administration. The important features are described below.")
P("1. User Registration and Login", st_num)
P("Users register on the platform by providing their name, email, password, profile image and "
  "role. A student additionally selects their current class from grade 5 to 12 or "
  "undergraduate, while a teacher selects the multiple classes they teach. Passwords are "
  "never stored directly; they are hashed using bcrypt before being saved to the database.")
P("2. Secure Session Management", st_num)
P("After successful login, a JSON Web Token is issued and placed inside an httpOnly cookie "
  "that remains valid for seven days. Because the token is stored in an httpOnly cookie, "
  "client-side JavaScript cannot read it, which protects the session against cross-site "
  "scripting attacks. The application also provides a session-restore endpoint so that a "
  "returning user is logged in automatically.")
P("3. Role-Based Access Control", st_num)
P("The platform defines three roles: Student, Teacher and Admin. Each role reaches only the "
  "pages and API endpoints intended for it. Dedicated middleware verifies the token, checks "
  "the user role, and additionally confirms course enrolment before allowing a student to "
  "stream protected lecture content.")
P("4. Course Creation and Management", st_num)
P("A teacher can create, update and delete a course, providing a title, description, category, "
  "thumbnail image, trailer video, level, teaching language, price, eligibility requirements "
  "and learning outcomes. A course remains in draft state until the teacher explicitly "
  "publishes it, so unfinished content is never visible to students.")
P("5. Structured Content Hierarchy", st_num)
P("Course content is organised into Modules, each containing Chapters, and each containing "
  "Lectures. This three-level structure keeps large syllabuses manageable and guarantees that "
  "students always follow an intended learning sequence.")
P("6. Multiple Lecture Formats", st_num)
P("A lecture can contain an uploaded video file, a YouTube video link, a live class link with "
  "a scheduled time, written theory content, a downloadable attachment, and any number of "
  "study materials. This flexibility allows a single platform to serve theory subjects, "
  "practical subjects and language courses.")
P("7. Smooth Video Streaming", st_num)
P("Lecture videos are served using the HTTP Range request mechanism, which returns partial "
  "content with a 206 status code. The player therefore fetches only the portion of the file "
  "it needs, allowing large video lectures to start quickly and allowing seeking to work "
  "smoothly without downloading the entire file first.")
P("8. Grade and Language Based Course Filtering", st_num)
P("Courses are tagged with a target class and, where relevant, a teaching language. A student "
  "registered for a particular grade automatically sees only the courses matching that grade, "
  "along with courses open to all classes. Language courses carry an additional language "
  "badge so that a student looking for Hindi or Sanskrit content can find it immediately.")
P("9. Quiz and Examination System", st_num)
P("Teachers build quizzes through a dedicated quiz builder. A quiz may be attached to an "
  "individual lecture as a topic test, or created at course level as a final examination with "
  "its own title. Each question stores the options, the correct answer and the marks, and "
  "every student attempt records the selected option, whether it was correct, the score "
  "obtained and the time of the attempt.")
P("10. Enrolment and Progress Tracking", st_num)
P("A student joins a course with a single click, and a unique enrolment record is created so "
  "that the same student cannot join the same course twice. Lecture completion and quiz scores "
  "are stored separately in a progress record, from which the completion percentage is "
  "calculated and displayed on the student dashboard.")
P("11. Student Dashboard", st_num)
P("The student dashboard shows the courses the learner has joined, the percentage of each "
  "course completed, the number of lectures finished, quiz scores, and a clear visual "
  "indication of how much content still remains. This makes progress measurable rather than "
  "assumed.")
P("12. Teacher Dashboard and Analytics", st_num)
P("Teachers receive analytics specific to their own classes: total enrolled students, who was "
  "active today and who was not, who attempted a quiz, average scores, courses inactive for "
  "seven days, course-wise content counts and revenue figures. These insights help the teacher "
  "identify struggling students early rather than at the end of the term.")
P("13. Grounded AI Study Assistant", st_num)
P("A student who has enrolled in a course can ask questions about its content. The assistant "
  "receives only the lesson notes and course material supplied to it and is explicitly "
  "instructed to reply that the topic is not covered in the material when the answer is not "
  "available. This grounding rule prevents the AI from inventing explanations that contradict "
  "the teacher&rsquo;s actual content.")
P("14. AI Student Guide and AI Teacher Guide", st_num)
P("Two additional assistants answer personalised questions. The Student Guide responds to "
  "questions about the learner&rsquo;s own study routine, such as which lecture comes next, "
  "which quiz is pending, or how much of the course is complete. The Teacher Guide answers "
  "questions about the teacher&rsquo;s own students and course performance. For both guides the "
  "numbers are computed directly in application code and the language model is used only to "
  "rephrase them, which guarantees that the figures quoted are always correct and can never be "
  "hallucinated.")
P("15. AI Safety and Privacy Guardrails", st_num)
P("The AI layer is protected on four fronts. It is grounded to the supplied material, it is "
  "forbidden from revealing any other user&rsquo;s personal details, it refuses requests for "
  "illegal activity, weapons, hacking, exam cheating or self-harm before any model is even "
  "called, and a sanitiser removes any email address or phone number that slips into a "
  "response. A verification script runs a set of test cases covering refusals and permitted "
  "study questions to confirm that the rules hold.")
P("16. Configurable AI Provider with Encrypted Keys", st_num)
P("An administrator can select the AI provider from the admin console, paste the API key and "
  "test the connection before saving, so no environment file needs to be edited. The key is "
  "stored in the database encrypted using AES-256-GCM with a key derived from the "
  "application secret and is never returned by any API endpoint &mdash; only a masked hint such "
  "as the first and last few characters is displayed.")
P("17. Admin Control Centre and Reports", st_num)
P("The admin console provides overview statistics, detailed reports on teachers, students, "
  "courses and enrolments, a recent-activity feed, user role management, teacher request "
  "approval, and a cleanup section for removing draft and orphaned records. Reports exclude "
  "hidden data by default, so the figures always reflect a clean state.")
P("18. Dark and Light Theme", st_num)
P("The user interface offers both a dark and a light theme. The selected theme is remembered "
  "between visits and, on a first visit, automatically follows the operating system preference.")
PB()
# ============================================================ 8. ER DIAGRAM
P("ER DIAGRAM", st_h1)
P("The Entity Relationship Diagram below represents the data model of the system. The User "
  "entity is central to the platform and is referenced by nearly every other collection, either "
  "as a student or as the instructor of a course. Content is organised hierarchically from "
  "Course down to Module, Chapter and Lesson, while learning activity is captured separately in "
  "the Enrollment and Progress collections.", st_body)


def er_drawing():
    W, H = doc.width - 12, 302
    d = Drawing(W, H)
    bw, bh = 104, 48
    cx = [40, 184, 328]
    ry = [252, 172, 92, 12]
    EDGE = colors.HexColor("#4A4A4A")
    LBL = colors.HexColor("#333333")

    def node(col, row, title, fields):
        x, y = cx[col], ry[row]
        d.add(Rect(x, y, bw, bh, fillColor=LIGHT, strokeColor=ACCENT,
                   strokeWidth=1.1, rx=5, ry=5))
        d.add(String(x + bw / 2, y + bh - 15, title, fontName="Helvetica-Bold",
                     fontSize=9.6, textAnchor="middle", fillColor=ACCENT))
        d.add(String(x + 8, y + bh - 27, fields[0], fontName="Helvetica",
                     fontSize=6.2, fillColor=colors.black))
        if len(fields) > 1:
            d.add(String(x + 8, y + bh - 36, fields[1], fontName="Helvetica",
                         fontSize=6.2, fillColor=colors.black))

    def lbl(x, y, text, anchor="middle"):
        d.add(String(x, y, text, fontName="Helvetica-Oblique", fontSize=6.0,
                     textAnchor=anchor, fillColor=LBL))

    from reportlab.graphics.shapes import Polygon

    def arrowhead(x, y, dx, dy):
        s = 3.6
        pts = [x, y,
               x - s * dx + s * 0.5 * dy, y - s * dy - s * 0.5 * dx,
               x - s * dx - s * 0.5 * dy, y - s * dy + s * 0.5 * dx]
        d.add(Polygon(pts, fillColor=EDGE, strokeColor=None))

    def hline(x1, x2, y, text, dx=1):
        d.add(Line(x1, y, x2, y, strokeColor=EDGE, strokeWidth=0.9))
        arrowhead(x2, y, dx, 0)
        lbl((x1 + x2) / 2, y + 4, text)

    def vline(x, y1, y2, text, dy=1, anchor="start", dx=4):
        d.add(Line(x, y1, x, y2, strokeColor=EDGE, strokeWidth=0.9))
        arrowhead(x, y2, 0, dy)
        lbl(x + dx, (y1 + y2) / 2 + 2, text, anchor=anchor)

    node(0, 0, "USER", ["_id, name, email,", "password, role, grade"])
    node(1, 0, "COURSE", ["_id, title, category,", "grade, price, isPublished"])
    node(2, 0, "MODULE", ["_id, title, order,", "courseId -> Course"])
    node(0, 1, "QUIZ", ["_id, quizTitle,", "scope: lesson / course"])
    node(1, 1, "LESSON", ["_id, title, topic,", "chapterId -> Chapter"])
    node(2, 1, "CHAPTER", ["_id, title, order,", "moduleId -> Module"])
    node(0, 2, "ENROLLMENT", ["_id,", "student, course"])
    node(1, 2, "PROGRESS", ["_id, completedLessons,", "studentId, courseId"])
    node(2, 2, "TEACHER REQUEST", ["_id, userId,", "status, reason"])
    node(2, 3, "AI SETTINGS", ["_id, provider,", "key (AES encrypted)"])

    # --- content / ownership links (horizontal between columns)
    hline(cx[0] + bw, cx[1], ry[0] + 32, "instructor")
    hline(cx[1] + bw, cx[2], ry[0] + 32, "has")
    hline(cx[0] + bw, cx[1], ry[1] + 32, "quiz")
    hline(cx[1] + bw, cx[2], ry[1] + 32, "has")

    # --- vertical chain in the right column
    vline(cx[2] + bw / 2, ry[0], ry[1] + bh, "has", dy=-1, dx=5)
    vline(cx[2] + bw / 2, ry[2] + bh, ry[3], "configures", dy=-1, dx=5)

    # --- USER -> ENROLLMENT, routed through the left channel
    ch_x = 16
    d.add(Line(cx[0], ry[0] + 32, ch_x, ry[0] + 32, strokeColor=EDGE, strokeWidth=0.9))
    d.add(Line(ch_x, ry[0] + 32, ch_x, ry[2] + 32, strokeColor=EDGE, strokeWidth=0.9))
    d.add(Line(ch_x, ry[2] + 32, cx[0], ry[2] + 32, strokeColor=EDGE, strokeWidth=0.9))
    arrowhead(cx[0], ry[2] + 32, 1, 0)
    lbl(ch_x - 3, (ry[0] + ry[2]) / 2 + 32, "student", anchor="end")

    # --- COURSE -> PROGRESS, routed through the middle channel
    mid_x = cx[1] + bw + 20
    d.add(Line(cx[1] + bw, ry[2] + 32, mid_x, ry[2] + 32, strokeColor=EDGE, strokeWidth=0.9))
    d.add(Line(mid_x, ry[2] + 32, mid_x, ry[0] + 32, strokeColor=EDGE, strokeWidth=0.9))
    d.add(Line(mid_x, ry[0] + 32, cx[1] + bw, ry[0] + 32, strokeColor=EDGE, strokeWidth=0.9))
    arrowhead(cx[1] + bw, ry[0] + 32, -1, 0)
    lbl(mid_x + 3, (ry[0] + ry[2]) / 2 + 32, "courseId", anchor="start")

    # --- USER -> TEACHER REQUEST, routed through the right channel
    rc_x = cx[2] + bw + 26
    d.add(Line(cx[2] + bw, ry[2] + 32, rc_x, ry[2] + 32, strokeColor=EDGE, strokeWidth=0.9))
    d.add(Line(rc_x, ry[2] + 32, rc_x, ry[0] + 32, strokeColor=EDGE, strokeWidth=0.9))
    d.add(Line(rc_x, ry[0] + 32, cx[2] + bw, ry[0] + 32, strokeColor=EDGE, strokeWidth=0.9))
    arrowhead(cx[2] + bw, ry[0] + 32, -1, 0)
    lbl(rc_x - 3, (ry[0] + ry[2]) / 2 + 32, "userId", anchor="end")
    return d


story.append(er_drawing())
SP(8)
P("Key relationships: a User may be a Student or a Teacher; a Teacher instructs many Courses; "
  "a Course contains many Modules; a Module contains many Chapters; a Chapter contains many "
  "Lessons; a Lesson may carry many Quizzes. A Student and a Course together form exactly one "
  "Enrollment, while Progress stores the completion and score history for that pairing.",
  st_body)
PB()
# ============================================================ 9. BENEFITS
P("BENEFITS", st_h1)
P("The system provides clear advantages to each group that uses it, as well as to the "
  "institution as a whole.")
P("Benefits to Students", st_h2)
BUL([
    "Students can access course content at any time and from any device, removing the "
    "dependency on physical attendance and fixed classroom hours.",
    "A student automatically sees only the courses matching their class and preferred "
    "language, which removes irrelevant content from their browsing experience.",
    "Lecture videos start quickly and support seeking, so a student can revise a specific "
    "section instead of replaying an entire recording.",
    "Study materials and attachments are downloadable, allowing offline revision when "
    "internet access is limited.",
    "Quizzes provide immediate feedback with automatic scoring, allowing a student to "
    "identify weak topics immediately rather than waiting for a result declared later.",
    "A visual progress dashboard shows the exact percentage of each course completed, "
    "which keeps the learner motivated and informed.",
    "The AI Study Assistant and Student Guide answer routine questions instantly, "
    "including at times when no teacher is available.",
])
P("Benefits to Teachers", st_h2)
BUL([
    "A teacher can prepare an entire course once and reuse it across batches, reducing "
    "repetitive content preparation.",
    "The module, chapter and lecture structure keeps large syllabuses organised and easy "
    "to navigate.",
    "The quiz builder allows quick, repeatable assessment without manually marking answers.",
    "Analytics show who is active, who has stopped practising and who is struggling, "
    "allowing targeted intervention before a student falls behind.",
    "The Teacher Guide answers routine class queries instantly, saving time otherwise "
    "spent on repeatedly checking records.",
    "The AI layer is grounded to the teacher&rsquo;s own material, so the assistant cannot "
    "introduce content the teacher has not provided.",
])
P("Benefits to Administrators", st_h2)
BUL([
    "A single control centre provides consolidated statistics on users, courses, "
    "enrolments, content and revenue.",
    "Detailed reports on teachers, students and courses support evidence-based "
    "decision-making.",
    "User roles can be changed, teacher requests approved and accounts disabled directly "
    "from the console.",
    "Draft and orphaned records can be identified and cleaned up, keeping reported "
    "figures accurate.",
    "The AI provider and its key can be configured from the interface, so no server file "
    "needs to be edited.",
])
P("Benefits to the Institution", st_h2)
BUL([
    "Replaces scattered registers, spreadsheets and messaging groups with one organised "
    "digital platform.",
    "Creates a permanent, searchable record of all teaching material and student activity.",
    "Improves transparency in tracking course completion and assessment outcomes.",
    "Supports digital transformation and provides a scalable base on which fee "
    "management, certification and formal reporting can later be built.",
    "Reduces administrative workload, allowing staff to focus on teaching rather than "
    "record keeping.",
])
PB()

# ============================================================ 10. IMPLEMENTATION
P("IMPLEMENTATION", st_h1)
P("The ATS Learning Management System is implemented as a full-stack web application using "
  "the MERN stack. The frontend is built with React 19 and bundled using Vite, the backend "
  "runs on Node.js with the Express 5 framework, and data is stored in MongoDB Atlas through "
  "Mongoose. The application follows a layered architecture in which each request travels "
  "from the user interface to a route, then to a controller, then to the database model, with "
  "dedicated middleware handling authentication, authorisation and error handling.")
P("1. Technology Stack", st_num)
P("<b>Frontend:</b> React 19, React Router DOM 7, Vite, Axios for HTTP requests, "
  "lucide-react and react-icons for interface icons, and react-hot-toast for notifications. "
  "<b>Backend:</b> Node.js, Express 5, Mongoose 9, jsonwebtoken, bcrypt, Multer for file "
  "uploads, cors, cookie-parser and dotenv. <b>Database:</b> MongoDB Atlas accessed through "
  "Mongoose schemas. <b>Deployment:</b> Vercel, using a serverless entry point for the "
  "backend and the Vite build output for the frontend.")
P("2. System Design", st_num)
P("The backend is organised into a clear set of layers. Routes define the available endpoints "
  "and attach the necessary middleware. Controllers contain the business logic for each "
  "operation. Models define the database schemas, validation rules and indexes. Middlewares "
  "perform authentication, role checking, enrolment verification and centralised error "
  "handling, while a shared asynchronous handler wrapper ensures that rejected promises are "
  "forwarded to the error middleware instead of terminating the process silently.")
P("3. Database Design", st_num)
P("The data model is defined using Mongoose schemas. The User schema stores identity, hashed "
  "password, role, grade and profile image. Course stores the catalogue metadata and the "
  "publishing flag. Module, Chapter and Lesson store the content hierarchy, with Lesson "
  "holding video, theory, attachments and materials. Quiz stores questions, options and "
  "correct answers together with a scope indicating whether it is a lecture quiz or a final "
  "course examination. Enrollment records which student joined which course, and Progress "
  "stores completed lectures and every quiz attempt with its score and timestamp. Timestamps "
  "are enabled on all schemas, and compound indexes are added on the frequently queried "
  "combinations so that analytics remain fast as the student base grows.")
P("4. Authentication and Authorisation", st_num)
P("On registration, the submitted password is hashed with bcrypt and only the hash is stored. "
  "On login, the entered password is compared against that hash and, on success, a signed "
  "token is generated. The token is set as an httpOnly, same-site cookie rather than being "
  "placed in browser-accessible storage, which prevents scripts from reading it. Every "
  "protected request carries that token, which the middleware verifies before allowing "
  "access. Role middleware then confirms whether the account is a student, teacher or "
  "administrator, and a separate enrolment middleware verifies that a student has actually "
  "joined the course whose lecture they are trying to stream.")
P("5. Course Authoring and Publishing", st_num)
P("When a teacher saves a course it is stored with the publishing flag set to false, so it "
  "remains a private draft. Only published courses are returned to students. The teacher can "
  "later edit any field, upload a new thumbnail or trailer, or remove the course entirely. "
  "Images and video files are handled through Multer, which stores the files on the server "
  "under a dedicated uploads directory and records the file name in the database.")
P("6. Content Hierarchy Management", st_num)
P("Modules, chapters and lectures are created and ordered within their parent. Each entity "
  "stores a reference to its parent alongside a numeric order field, so the sequence in which "
  "content is presented can be controlled explicitly rather than depending on insertion "
  "order. Deleting a parent cascades logically to its children, which prevents orphaned "
  "content from remaining in the database.")
P("7. Video Streaming", st_num)
P("Serving an entire lecture video at once would be slow and wasteful, particularly on a "
  "mobile connection. The streaming endpoint therefore inspects the Range request header sent "
  "by the browser and returns only the requested byte range with a 206 Partial Content "
  "status, together with the appropriate headers. This allows the video element to seek to any "
  "position without transferring the whole file, and the endpoint remains protected so that "
  "only enrolled students can stream the content.")
P("8. Assessment and Progress Calculation", st_num)
P("When a student submits a quiz, the backend compares each selected option against the stored "
  "correct answer, calculates the score and appends an attempt entry to the progress record "
  "containing the score, the total marks, the time of the attempt and the answers given. "
  "Completion percentage is derived by comparing the number of completed lectures against the "
  "total lectures in the course, giving an accurate and automatically updated figure on the "
  "dashboard.")
P("9. AI Integration", st_num)
P("The AI layer is implemented as a service called from dedicated endpoints. A general "
  "assistant endpoint answers free questions, a study assistant endpoint accepts course "
  "material and answers only from it, and separate guide services handle the personalised "
  "student and teacher queries. Every call passes through a guardrail module that first checks "
  "whether the request should be refused outright, then supplies the model with strict system "
  "instructions, and finally sanitises the output before it is displayed. A retry mechanism "
  "handles temporary provider errors, and model fallback avoids failures when a selected model "
  "is unavailable.")
P("10. Testing and Verification", st_num)
P("Correctness of the AI behaviour was verified using dedicated scripts rather than manual "
  "inspection. One script exercises the guardrails against a set of refusal and permitted "
  "question cases. Another creates a temporary student, publishes a course, tests the guide and "
  "then rolls everything back. Further scripts verify grade-based filtering and the selection "
  "of the next scheduled class. In this way the project demonstrates that its most sensitive "
  "features behave as intended rather than merely appearing to work.")
P("11. Deployment", st_num)
P("The frontend is built using Vite and the backend is exposed through a serverless entry "
  "point, with a configuration file mapping the API routes. The application is hosted on "
  "Vercel so that it is publicly accessible over HTTPS. Because the platform is serverless, "
  "uploaded files are written to temporary storage, which is an important consideration for a "
  "production deployment.")
PB()

# ============================================================ 11. CHALLENGES
P("CHALLENGES FACED", st_h1)
P("Several technical and operational challenges were encountered during the development of "
  "the project. Each of these led to a better understanding of production-quality application "
  "design.")
P("1. Video Delivery and Large File Handling", st_num)
P("The first approach of serving complete video files worked for small recordings but caused "
  "long loading times for longer lectures. Implementing HTTP Range requests resolved the "
  "problem and enabled proper seeking. A related issue was that the serverless deployment "
  "environment provides only temporary file storage, which had to be accounted for in the "
  "upload configuration.")
P("2. Preventing AI Hallucination", st_num)
P("A general language model will confidently produce an answer even when the topic is not "
  "present in the supplied material. The solution was to ground the model strictly to the "
  "lesson content and to require an explicit refusal phrase when the answer is unavailable. "
  "This remains an active area of improvement, since no prompt alone can fully guarantee "
  "accuracy.")
P("3. Keeping Personalised AI Answers Accurate", st_num)
P("Asking a language model to count a teacher&rsquo;s students or calculate a completion "
  "percentage produces unreliable results. The problem was resolved by computing every figure "
  "in application code and using the model only to phrase the sentence. The code-built answer "
  "is also returned as a fallback whenever the model declines to answer, ensuring the user "
  "always receives correct information.")
P("4. Privacy Protection in AI Responses", st_num)
P("Even when instructed not to do so, a model may occasionally include an email address or "
  "phone number in its response. A post-processing sanitiser was therefore implemented to "
  "strip such patterns, combined with system-level restrictions that permanently block "
  "queries about other users&rsquo; data.")
P("5. Role and Ownership Boundaries", st_num)
P("Preventing one teacher from seeing another teacher&rsquo;s students, and preventing "
  "students from streaming content they have not enrolled for, required dedicated middleware "
  "and carefully scoped database queries. This was verified with automated scripts that create "
  "temporary data and confirm that no cross-account information is ever returned.")
P("6. Database Connection Stability", st_num)
P("Connecting to the cloud database occasionally failed due to transient DNS and network "
  "resolution errors, and an unconfigured IP whitelist caused connections to be rejected. A "
  "retry mechanism with clear diagnostic messages was added, along with documented guidance "
  "on network access configuration.")
P("7. Performance of Analytics Queries", st_num)
P("The teacher analytics functions run on every question asked to the teacher guide. Without "
  "indexes, these repeated queries would slow down noticeably as the number of students grew. "
  "Compound indexes were added on the specific field combinations used by these queries, "
  "which kept response times low.")
P("8. AI Provider Reliability", st_num)
P("External AI providers occasionally return rate-limit or server errors, and a selected "
  "model may be retired. The integration layer was built to retry on temporary failures and to "
  "fall back automatically to an alternative model, and to surface a meaningful error message "
  "rather than a generic failure if every attempt fails.")
PB()

# ============================================================ 12. FUTURE SCOPE
P("FUTURE SCOPE", st_h1)
P("The present system provides a complete and functional learning platform, but several "
  "enhancements would extend its capability further.")
BUL([
    "Real-time collaboration through live video classes with attendance marking, screen "
    "sharing and an integrated chat room.",
    "Automated attendance and certification, generating a verifiable certificate when a "
    "student completes all lectures and passes the final examination.",
    "A discussion forum and doubt-clarification section beneath each lecture, allowing "
    "students to ask questions that the teacher can answer publicly.",
    "Automated email and notification alerts for new lectures, upcoming classes, quiz "
    "results and enrolment confirmations.",
    "Recommendations that suggest courses based on a student&rsquo;s grade, enrolled "
    "subjects and activity pattern.",
    "Support for multiple video providers and direct cloud storage such as object storage "
    "or a video streaming service, removing reliance on temporary serverless storage.",
    "A mobile application for Android and iOS to complement the responsive web interface.",
    "A dedicated attendance register with daily present and absent records for each "
    "class, currently inferred from activity.",
    "Assessment improvements including timed quizzes, negative marking, multiple question "
    "types and automated question bank generation from the lesson material.",
    "Advanced analytics in the form of performance graphs, comparative cohort analysis and "
    "exportable reports for institutional review.",
    "Offline access allowing students to download course material and revise without an "
    "internet connection.",
    "Integration with external learning resources and a mechanism for issuing verified "
    "completion certificates.",
])
PB()
# ============================================================ 13. CONCLUSION
P("CONCLUSION", st_h1)
P("The ATS Learning Management System has been successfully designed and developed as a "
  "full-stack web application that connects teachers and students through a single organised "
  "digital platform. The system achieves its primary objective by providing a structured "
  "content hierarchy, secure authentication, smooth content delivery, meaningful assessment "
  "and measurable progress tracking.")
P("The project also demonstrates that artificial intelligence can be integrated responsibly. "
  "By grounding every answer to supplied material, computing personalised figures directly in "
  "code, encrypting stored API keys and enforcing strict refusal and sanitisation rules, the "
  "platform delivers the convenience of AI assistance without allowing it to introduce "
  "inaccurate content or expose private information.")
P("Through this project, practical experience has been gained in full-stack web development, "
  "database modelling, secure authentication, role-based access control, file handling and "
  "streaming, cloud deployment, and the careful engineering of AI behaviour. The result is a "
  "system that is not only technically complete but also practically useful, and it provides a "
  "strong foundation for future enhancements.")
PB()

# ============================================================ 14. SCREENSHOTS
P("PROJECT SCREENSHOTS", st_h1)
P("The following screenshots represent the major modules of the ATS Learning Management "
  "System developed during the Summer Training Project. Each screenshot illustrates one of the "
  "primary screens described earlier in this report.")
SP(4)
shots = [
    ("1. Home Page", "Landing page of the platform with the hero section, featured courses and navigation to courses and login."),
    ("2. Registration and Login", "User registration with role selection, grade selection for students and profile image upload, followed by the login screen."),
    ("3. Course Catalogue", "Course listing page with filters for category, level and language, along with class and language badges."),
    ("4. Course Detail Page", "Course overview with description, requirements, learning outcomes, trailer video and the enrol button."),
    ("5. Student Dashboard", "Dashboard showing enrolled courses, completion percentage, lectures finished and quiz scores."),
    ("6. Learning Page", "The lecture player showing the video, module and chapter navigation, theory content and downloadable study materials."),
    ("7. Quiz Attempt", "Quiz interface presenting multiple-choice questions with automatic scoring and immediate feedback."),
    ("8. AI Study Assistant", "The AI assistant answering questions using only the lesson material of the enrolled course."),
    ("9. AI Student Guide", "The personalised assistant answering questions about the learner&rsquo;s own progress, next lecture and pending quizzes."),
    ("10. AI Teacher Guide", "The teacher&rsquo;s analytics assistant reporting enrolled students, activity, quiz attempts and average scores."),
    ("11. Teacher Dashboard", "Teacher console listing created courses with content counts, enrolled students and revenue figures."),
    ("12. Course Builder", "Course creation form with category, level, language, price, requirements, learning outcomes and thumbnail upload."),
    ("13. Content Manager", "Interface for creating modules, chapters and lectures and uploading videos, notes and study materials."),
    ("14. Quiz Builder", "Interface for creating topic quizzes and final examinations with options, correct answers and marks."),
    ("15. Admin Console", "Administrative control centre with overview statistics, detailed reports and recent activity."),
    ("16. AI Settings", "Admin panel for selecting the AI provider, pasting the API key, testing the connection and saving the configuration."),
]
sdata = []
for a, b in shots:
    num = a.split(".")[0]
    title = a.split(".", 1)[1].strip()
    sdata.append([Paragraph("<b>Fig. %s</b>" % num, st_cell),
                  Paragraph("<b>%s</b>" % title, st_cell),
                  Paragraph(b, st_cell)])
stbl = Table(sdata, colWidths=[16 * mm, 44 * mm, doc.width - 60 * mm], hAlign="CENTER",
             repeatRows=0)
stbl.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#999999")),
    ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT]),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(stbl)
SP(10)
P("Note: The table above lists the modules of the project in the order they should be "
  "captured. The actual screenshots can be inserted at the corresponding positions in the "
  "final report document.", S("note", fontSize=10, textColor=GREY, fontName="Helvetica-Oblique"))

# ----------------------------------------------------------------- build
from reportlab.platypus.doctemplate import NextPageTemplate

story.insert(0, NextPageTemplate("Body"))
doc.build(story)
print("PDF written to:", OUT)
