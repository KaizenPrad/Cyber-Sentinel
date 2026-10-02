// This file is an ingest route file. It contains the backend logic for:
// Receiving new security signals from outside
// Supporting TWO login methods: API key and JWT token
// Checking the signal data before saving it
// It sits between the HTTP request and your ingest controller.

import { Router } from 'express';
// The Router lets you group URLs together in one file.

import { ingest } from '../controllers/ingest.controller.js';
// This is the controller function that saves the signal.

import { authenticate } from '../middleware/auth.middleware.js';
// This checks a normal JWT login from a user.

import { authenticateApiKey } from '../middleware/apiKey.middleware.js';
// This checks an API key login from a server.

import { validate } from '../middleware/validate.middleware.js';
// This checks the request data against your schemas before it reaches the controller.

import { ingestSchema } from '../validations/sentinal.validation.js';
// This is the validation rule for incoming signal data.

// This is the router object for the ingest URL
const router = Router(); // this line creates the router

/**
 * Ingest endpoint supports TWO authentication methods:
 * 1. API Key (recommended for server-to-server): Authorization: Bearer cs_live_...
 * 2. JWT Token (for backward compatibility): Authorization: Bearer <jwt_token> or cookie
 * 
 * The middleware chain tries API key first, then falls back to JWT.
 */
// This is the ingest route that accepts new signals
router.post('/',  // this line handles POST requests to /
  // Try API key authentication first
  async (req, res, next) => { // this line starts a small checker that picks the login type
    const authHeader = req.headers.authorization; // this line reads the Authorization header
    if (authHeader?.startsWith('Bearer cs_live_')) { // this line checks if it looks like an API key
      return authenticateApiKey(req, res, next); // this line logs in with the API key
    } // this line closes the API key check
    // Fall back to JWT authentication
    return authenticate(req, res, next); // this line logs in with the normal JWT token
  }, // this line closes the login checker
  validate(ingestSchema), // this line checks the signal data is correct
  ingest // this line saves the signal
); // this line closes the POST route

export default router; // this line exports the router so app.js can use it
