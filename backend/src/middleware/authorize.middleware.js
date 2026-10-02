// This file is an authorization middleware. It contains the backend logic for:
// Checking if the user is logged in
// Checking if the user has one of the allowed roles
// Blocking the request with 401 or 403 when not allowed
// It sits between the authentication step and your protected route handler.

export function authorize(...roles) { // this line defines the authorize function that takes allowed roles
  // Return a middleware function
  return (req, res, next) => { // this line returns the real middleware Express will run
    // If no user attached (should not happen if authenticate runs first), return 401
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' }); // this line sends back Unauthorized when no user is found
    // If user's role is not in the allowed roles, return 403 Forbidden
    if (!roles.includes(req.user.role)) { // this line checks if the user role is in the allowed list
      return res.status(403).json({ success: false, error: 'Forbidden' }); // this line sends back Forbidden when the role is not allowed
    }
    // User has required role, continue
    next(); // this line moves on to the next middleware or route
  }; // this line ends the returned middleware function
}
export default authorize; // this line exports authorize as the default so it can be imported easily
