// This file is an async handler helper. It contains the backend logic for:
// Wrapping async route handlers
// Catching promise errors automatically
// Passing errors to the Express error middleware
// It sits between your async controller and Express error handling.

// This is the asyncHandler function that wraps async route handlers
export const asyncHandler = (fn) => (req, res, next) => // this line defines asyncHandler that takes your async function
  Promise.resolve(fn(req, res, next)).catch(next); // this line runs your function and sends any error to next
export default asyncHandler; // this line exports asyncHandler as the default so it can be imported easily
