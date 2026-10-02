// This file is a graph route file. It contains the backend logic for:
// Showing the attack graph data
// It sits between the HTTP request and your report controller function.

import { Router } from 'express';
// The Router lets you group URLs together in one file.

import { getGraphOnly } from '../controllers/report.controller.js';
// This is the controller function that builds the graph data.

import { authenticate } from '../middleware/auth.middleware.js';
// This checks the user is logged in before they can use this route.

// This is the router object for the graph URL
const router = Router(); // this line creates the router
router.use(authenticate); // this line protects every route below so only logged in users pass
router.get('/', getGraphOnly); // this line returns the graph data
export default router; // this line exports the router so app.js can use it
