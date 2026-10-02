// This file is an error handling middleware. It contains the backend logic for:
// Sending a 404 when no route matches
// Logging server errors to the console
// Sending a safe error message back to the client
// It sits at the very end of your Express app after all routes.

// This is the notFound function that handles unknown routes
// It runs when no other route matches the request
export function notFound(_req, res) { // this line defines the notFound function with request and response
  // Send a JSON response with 404 status
  res.status(404).json({ success: false, error: 'Not found' }); // this line sends back the Not found error
}

// This is the errorHandler function that handles all other errors
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) { // this line defines the error handler with error, request, response, and next
  // Log the error to console for debugging
  console.error(err); // this line prints the error so you can see it in the terminal
  // Get status code from error or default to 500
  const status = err.status || 500; // this line picks the error status or uses 500 for server error
  // Send error response
  // In production, hide internal error details; in development, show the message
  res.status(status).json({ // this line starts the error response with the right status
    success: false, // this line says the request did not succeed
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, // this line hides details in production but shows the message in development
  }); // this line ends the JSON response
}
export default errorHandler; // this line exports errorHandler as the default so it can be imported easily
