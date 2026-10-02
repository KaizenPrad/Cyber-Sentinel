// This file is a monitor route file. It contains the backend logic for:
// Listing security signals
// Showing dashboard stats
// It sits between the HTTP request and your monitor controller functions.

import { Router } from 'express';
// The Router lets you group URLs together in one file.

import { listSignals, dashboardStats } from '../controllers/monitor.controller.js';
// These are controller functions that fetch signals and stats.

import { authenticate } from '../middleware/auth.middleware.js';
// This checks the user is logged in before they can use these routes.

import { validate } from '../middleware/validate.middleware.js';
// This checks the request data against your schemas before it reaches the controller.

import { monitorQuerySchema } from '../validations/sentinal.validation.js';
// This is the validation rule for the ?query filters like page and limit.

// This is the router object for all monitor URLs
const router = Router(); // this line creates the router
router.use(authenticate); // this line protects every route below so only logged in users pass
router.get('/signals', validate(monitorQuerySchema, 'query'), listSignals); // this line lists signals with filters
router.get('/stats', dashboardStats); // this line returns dashboard numbers
export default router; // this line exports the router so app.js can use it
