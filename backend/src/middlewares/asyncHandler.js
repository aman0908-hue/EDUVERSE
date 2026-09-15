// Har try-catch ko replace karne ke liye smart handler
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};