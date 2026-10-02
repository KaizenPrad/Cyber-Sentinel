// This file is an API response helper. It contains the backend logic for:
// Sending a success response
// Sending a 201 created response
// Sending a paginated list response
// Sending an error response
// It sits between your controllers and the client to keep responses consistent.

// This is the ok function that sends a successful response
export const ok = (res, data, message) => // this line defines the ok helper that sends data
  res.json({ success: true, data, ...(message ? { message } : {}) }); // this line sends the JSON with success true plus an optional message

// This is the created function that sends a 201 Created response
export const created = (res, data, message) => // this line defines the created helper for new items
  res.status(201).json({ success: true, data, ...(message ? { message } : {}) }); // this line sends the JSON with status 201 plus an optional message

// This is the paginated function that sends a page of rows with metadata
export const paginated = (res, rows, page, limit, total) => // this line defines the paginated helper with rows and page info
  res.json({ // this line starts sending the JSON response
    success: true, // this line says the request succeeded
    data: rows, // this line sends the rows for this page
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }, // this line sends the page, limit, total, and total pages
  }); // this line ends the JSON response

// This is the fail function that sends an error response
export const fail = (res, status, error) => // this line defines the fail helper with status and error message
  res.status(status).json({ success: false, error }); // this line sends the JSON with success false and the error
