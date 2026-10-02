// This file is a report route file. It contains the backend logic for:
// Building the full security report
// It sits between the HTTP request and your report controller function.

import { Router } from 'express';
// The Router lets you group URLs together in one file.

import { getReport } from '../controllers/report.controller.js';
// This is the controller function that builds the report.

import { authenticate } from '../middleware/auth.middleware.js';
// This checks the user is logged in before they can use this route.

// This is the router object for the report URL
const router = Router(); // this line creates the router
router.use(authenticate); // this line protects every route below so only logged in users pass
router.get('/', getReport); // this line returns the full report
export default router; // this line exports the router so app.js can use it
