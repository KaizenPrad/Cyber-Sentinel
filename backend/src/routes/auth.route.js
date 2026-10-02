// This file is an authentication route file. It contains the backend logic for:
// Registering a new user
// Logging in
// Getting the current session/user
// Logging out
// API Key management (create, list, get, revoke)
// It sits between the HTTP request and your auth controller functions.

import { Router } from 'express';
// The Router lets you group URLs together in one file.

import { 
  register, 
  login, 
  session, 
  logout,
  createApiKey,
  listApiKeys,
  getApiKey,
  revokeApiKey,
  listMembers,
  updateMemberRole,
} from '../controllers/auth.controller.js';
// These are controller functions that do the real auth work.

import { validate } from '../middleware/validate.middleware.js';
// This checks the request data against your schemas before it reaches the controller.

import { authenticate } from '../middleware/auth.middleware.js';
// This checks the user is logged in before they can use protected routes.

import { registerSchema, loginSchema, memberParamsSchema, updateMemberRoleSchema } from '../validations/auth.validation.js';
// These are validation rules for register/login data and member role changes.

import { createApiKeySchema, apiKeyParamsSchema } from '../validations/sentinal.validation.js';
// These are validation rules for creating an API key and for the :id in the URL.

// This is the router object for all auth URLs
const router = Router(); // this line creates the router
router.post('/register', validate(registerSchema), register); // this line handles new user registration
router.post('/login', validate(loginSchema), login); // this line handles user login
router.get('/session', authenticate, session); // this line returns the logged in user
router.post('/logout', authenticate, logout); // this line logs the user out

// This is the API Key management section that needs a logged in user
// API Key management (requires authentication)
router.post('/api-keys', authenticate, validate(createApiKeySchema), createApiKey); // this line creates a new API key
router.get('/api-keys', authenticate, listApiKeys); // this line lists all API keys
router.get('/api-keys/:id', authenticate, validate(apiKeyParamsSchema, 'params'), getApiKey); // this line gets one API key by id
router.delete('/api-keys/:id', authenticate, validate(apiKeyParamsSchema, 'params'), revokeApiKey); // this line revokes an API key

// Organization members (admin): list everyone, OWNER can change roles
router.get('/members', authenticate, listMembers); // this line lists all members of your organization
router.patch('/members/:id', authenticate, validate(memberParamsSchema, 'params'), validate(updateMemberRoleSchema), updateMemberRole); // this line changes a member's role

export default router; // this line exports the router so app.js can use it
