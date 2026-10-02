// This file is the Express app setup. It contains the backend logic for:
// Creating the Express app
// Adding security, CORS, logging, JSON parsing, and cookie tools
// Adding rate limits to protect your API
// Connecting all your route files to URL paths
// Handling 404 and error responses
// It sits between the server entry point and your routes.

import express from 'express';
// This imports the Express framework so you can build a web server.

import helmet from 'helmet';
// This imports helmet which adds safe HTTP headers.

import cors from 'cors';
// This imports cors which lets your frontend talk to this backend.

import morgan from 'morgan';
// This imports morgan which logs each request in the terminal.

import rateLimit from 'express-rate-limit';
// This imports rate limiting to block too many requests.

import cookieParser from 'cookie-parser';
// This imports cookie parsing so you can read cookies from requests.

import { env } from './config/env.js';
// This imports your environment settings like the frontend URL.

import { notFound, errorHandler } from './middleware/error.middleware.js';
// These are error helper functions for 404 and server errors.

import authRoutes from './routes/auth.route.js';
// This imports your login and register routes.

import ingestRoutes from './routes/ingest.route.js';
// This imports your ingest routes for receiving signals.

import monitorRoutes from './routes/monitor.route.js';
// This imports your monitor routes for listing signals and stats.

import graphRoutes from './routes/graph.route.js';
// This imports your graph routes for attack graph data.

import detectionRoutes from './routes/detection.route.js';
// This imports your detection routes.

import incidentRoutes from './routes/incident.route.js';
// This imports your incident routes.

import reportRoutes from './routes/report.route.js';
// This imports your report routes.

// This is the app object that holds your whole Express server
const app = express(); // this line creates the Express app
app.set('trust proxy', 1); // this line trusts the first proxy so IP limits work behind hosting

app.use(helmet()); // this line adds security headers to every response
// Allow the configured frontend plus any local-dev origin (localhost/127.0.0.1
// on any port): browsers treat those as different origins, and rejecting them
// surfaces as an unreachable API in the UI. Non-local origins are still blocked.
const allowedOrigin = (origin, callback) => { // this line checks each request origin before allowing it
  if (!origin) return callback(null, true); // this line allows curl and other non-browser clients with no origin
  if (origin === env.frontendUrl) return callback(null, true); // this line allows the configured frontend URL
  try { // this line parses the origin so we can inspect its hostname
    const hostname = new URL(origin).hostname; // this line reads the hostname out of the origin
    if (hostname === 'localhost' || hostname === '127.0.0.1') return callback(null, true); // this line allows any local dev page
  } catch { /* fall through to deny below */ } // this line ignores unparsable origins so they get denied below
  return callback(null, false); // this line blocks every other origin
};
app.use(cors({ origin: allowedOrigin, credentials: true })); // this line allows approved frontend origins and lets cookies pass
app.use(morgan('dev')); // this line logs each request like GET /api/health
app.use(express.json({ limit: '1mb' })); // this line reads JSON bodies up to 1mb in size
app.use(cookieParser()); // this line reads cookies from incoming requests

// This is the general rate limiter for all API routes
const apiLimiter = rateLimit({ // this line creates the general limiter
  windowMs: 15 * 60 * 1000, // this line sets a 15 minute time window
  max: 200, // this line allows 200 requests per window
  standardHeaders: true, // this line sends standard limit headers
  legacyHeaders: false, // this line turns off old style limit headers
  message: { success: false, error: 'Too many requests' }, // this line is the message sent when limit is hit
}); // this line closes the general limiter
// This is the stricter limiter for login and register routes
const authLimiter = rateLimit({ // this line creates the auth limiter
  windowMs: 15 * 60 * 1000, // this line sets a 15 minute time window
  max: 30, // this line allows only 30 auth attempts per window
  standardHeaders: true, // this line sends standard limit headers
  legacyHeaders: false, // this line turns off old style limit headers
  message: { success: false, error: 'Too many auth attempts' }, // this line is the message sent when auth limit is hit
}); // this line closes the auth limiter

// This is the health check route to see if the server is alive
app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', service: 'cybersentinel' } })); // this line returns ok so you know the API is running

app.use('/api/', apiLimiter); // this line applies the general limiter to all /api/ routes
app.use('/api/auth', authLimiter, authRoutes); // this line connects auth routes with the strict limiter
app.use('/api/ingest', ingestRoutes); // this line connects ingest routes
app.use('/api/monitor', monitorRoutes); // this line connects monitor routes
app.use('/api/graph', graphRoutes); // this line connects graph routes
app.use('/api/detections', detectionRoutes); // this line connects detection routes
app.use('/api/incidents', incidentRoutes); // this line connects incident routes
app.use('/api/reports', reportRoutes); // this line connects report routes

app.use(notFound);// this line catches unknown URLs and returns 404
app.use(errorHandler); // this line catches server errors and returns a clean message

export default app; // this line exports the app so server.js can start it
