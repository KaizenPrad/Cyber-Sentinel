// This file is a validation middleware. It contains the backend logic for:
// Picking data from body, query, or params
// Validating the data against a Zod schema
// Sending back a 400 error when validation fails
// Saving the clean data for the next handler
// It sits between the HTTP request and your route handler.

export function validate(schema, source = 'body') { // this line defines the validate function with a schema and source
  // Return a middleware function that Express will call
  return (req, res, next) => { // this line returns the real middleware Express will run
    // Get data from the correct source: query params, route params, or body
    const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body; // this line picks the data from query, params, or body
    // Validate data against the Zod schema
    const result = schema.safeParse(data); // this line checks the data against the schema without throwing
    // If validation fails, return 400 with error details
    if (!result.success) { // this line checks if validation failed
      return res.status(400).json({ // this line starts the bad request response
        success: false, // this line says the request did not succeed
        error: result.error.errors[0]?.message || 'Validation failed', // this line sends the first error message
        details: result.error.errors, // this line sends all the error details
      }); // this line ends the JSON response
    }
    // Replace the original data with validated/coerced data
    if (source === 'query') req.query = result.data; // this line saves the clean query data back to the request
    else if (source === 'params') req.params = result.data; // this line saves the clean params data back to the request
    else req.validated = result.data; // this line saves the clean body data to req.validated
    // Continue to next middleware or route handler
    next(); // this line moves on to the next middleware or route
  }; // this line ends the returned middleware function
}
export default validate; // this line exports validate as the default so it can be imported easily
