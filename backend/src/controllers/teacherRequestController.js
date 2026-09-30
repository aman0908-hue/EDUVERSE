import TeacherRequest from '../models/TeacherRequest.js';

/** Logged-in user ka apna latest teacher request status. */
export const getMyTeacherRequest = async (req, res) => {
    const request = await TeacherRequest.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, request: request || null });
};
