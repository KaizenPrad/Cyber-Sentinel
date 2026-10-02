// This file is an incident route file. It contains the backend logic for:
// Listing all incidents
// Getting one incident by id
// Updating an incident
// Adding a remediation note to an incident
// It sits between the HTTP request and your incident controller functions.

import { Router } from 'express';
// The Router lets you group URLs together in one file.

import { listIncidents, getIncident, updateIncident, addRemediation } from '../controllers/incident.controller.js';
// These are controller functions that do the real incident work.

import { authenticate } from '../middleware/auth.middleware.js';
// This checks the user is logged in before they can use these routes.

import { validate } from '../middleware/validate.middleware.js';
// This checks the request data against your schemas before it reaches the controller.

import { updateIncidentSchema, remediationSchema } from '../validations/sentinal.validation.js';
// These are validation rules for updating an incident and for adding a remediation note.

// This is the router object for all incident URLs
const router = Router(); // this line creates the router
router.use(authenticate); // this line protects every route below so only logged in users pass
router.get('/', listIncidents); // this line lists all incidents
router.get('/:id', getIncident); // this line gets one incident by its id
router.patch('/:id', validate(updateIncidentSchema), updateIncident); // this line updates an incident
router.post('/:id/remediation', validate(remediationSchema), addRemediation); // this line adds a fix note to an incident
export default router; // this line exports the router so app.js can use it
