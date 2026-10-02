// This file is a detection route file. It contains the backend logic for:
// Listing all detections
// Getting one detection by id
// Promoting a detection into an incident
// It sits between the HTTP request and your detection controller functions.

import { Router } from 'express';
// The Router lets you group URLs together in one file.

import { listDetections, getDetection, promoteDetection } from '../controllers/detection.controller.js';
// These are controller functions that do the real detection work.

import { authenticate } from '../middleware/auth.middleware.js';
// This checks the user is logged in before they can use these routes.

// This is the router object for all detection URLs
const router = Router(); // this line creates the router
router.use(authenticate); // this line protects every route below so only logged in users pass
router.get('/', listDetections); // this line lists all detections
router.get('/:id', getDetection); // this line gets one detection by its id
router.post('/:id/promote', promoteDetection); // this line turns a detection into an incident
export default router; // this line exports the router so app.js can use it
