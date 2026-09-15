// Requirement ke hisaab se: handlers/asyncHandler.js
// (Yeh wahi async handler hai jo middlewares/asyncHandler.js mein hai)
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;