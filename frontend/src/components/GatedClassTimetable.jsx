import { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import api from '../utils/api.js';
import ClassTimetable from './ClassTimetable.jsx';

/**
 * 🔒 Enroll-gated wrapper around ClassTimetable.
 *
 * ClassTimetable renders the real meeting URLs, so it must never be mounted
 * without knowing whether the current user is actually enrolled. Doing the
 * check here (instead of in each page) guarantees every consumer of the
 * timetable inherits the lock automatically.
 *
 * Fails CLOSED: `canJoin` starts as false and only becomes true after a
 * confirmed enrollment, so a network error can never leak a join link.
 */
const GatedClassTimetable = (props) => {
    const params = useParams();
    const courseId = props.courseId || params.id || params.courseId;
    const { user } = useContext(UserContext);

    // Teachers run their own classes; admins moderate. Both may always join.
    const isPrivileged = user?.role === 'teacher' || user?.role === 'admin';

    const [canJoin, setCanJoin] = useState(false);

    useEffect(() => {
        if (!courseId) return;
        if (isPrivileged) {
            setCanJoin(true);
            return;
        }
        if (!user) {
            setCanJoin(false);
            return;
        }

        let cancelled = false;
        setCanJoin(false); // reset while we re-verify for a different course

        (async () => {
            try {
                const res = await api.get(`/courses/is-student-joined/${courseId}`);
                if (!cancelled) setCanJoin(!!res.data.joined);
            } catch (err) {
                if (!cancelled) setCanJoin(false);
                console.log('Timetable join check failed:', err?.response?.status);
            }
        })();

        return () => { cancelled = true; };
    }, [courseId, user, isPrivileged]);

    return <ClassTimetable {...props} canJoin={canJoin} />;
};

export default GatedClassTimetable;
