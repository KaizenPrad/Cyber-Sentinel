// This file holds validation schemas for Sentinel ingestion and queries:
// signalSchema checks one security signal
// ingestSchema checks a batch of up to 500 signals
// monitorQuerySchema checks list/filter query params
// updateIncidentSchema checks incident status updates
// remediationSchema checks remediation actions
// createApiKeySchema and apiKeyParamsSchema check API key routes
// It sits in front of the controllers so bad data never reaches the database.

import { z } from 'zod';
// The z library (zod) lets us describe and check the shape of data.

// Now we get to the first major schema. It Creates a Const named signalSchema
const signalSchema = z.object({ // this line starts an object schema for one signal
  signalType: z.string().min(1), // e.g. PHISH_CLICK, MASS_FILE_RENAME // this line requires a non-empty signal type like PHISH_CLICK
  category: z.enum(['NETWORK', 'AUTH', 'ENDPOINT', 'EMAIL', 'WEB']).default('NETWORK'), // this line allows only 5 categories and defaults to NETWORK
  severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('INFO'), // this line allows only 5 severities and defaults to INFO
  message: z.string().min(1), // this line requires a non-empty message
  sourceIp: z.string().optional(), // this line allows an optional source IP string
  userIdentity: z.string().optional(), // this line allows an optional user name string
  hostname: z.string().optional(), // this line allows an optional hostname string
  domain: z.string().optional(), // this line allows an optional domain string
  deviceId: z.string().optional(), // this line allows an optional device id string
  rawData: z.record(z.any()).default({}), // this line allows any extra JSON object and defaults to empty
  eventTimestamp: z.string().datetime().or(z.string().min(1)), // this line requires a datetime string or any non-empty string
});

// This is the ingestSchema that checks a batch upload of signals
export const ingestSchema = z.object({ // this line starts an object schema for ingestion
  signals: z.array(signalSchema).min(1).max(500), // this line requires 1 to 500 signals in one request
});

// This is the monitorQuerySchema that checks list/filter query params
export const monitorQuerySchema = z.object({ // this line starts an object schema for monitor queries
  page: z.coerce.number().int().min(1).default(1), // this line turns the page query into a number defaulting to 1
  limit: z.coerce.number().int().min(1).max(100).default(20), // this line turns the limit query into a number from 1-100 defaulting to 20
  severity: z.string().optional(), // this line allows an optional severity filter
  category: z.string().optional(), // this line allows an optional category filter
  search: z.string().optional(), // this line allows an optional free-text search
  minRisk: z.coerce.number().min(0).max(100).default(0), // this line turns minRisk into a 0-100 number defaulting to 0
});

// This is the updateIncidentSchema that checks incident updates
export const updateIncidentSchema = z.object({ // this line starts an object schema for incident updates
  status: z.enum(['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED', 'FALSE_POSITIVE', 'DISMISSED']).optional(), // this line allows only valid incident statuses
  assigneeId: z.string().nullable().optional(), // this line allows a user id, null to unassign, or nothing
});

// This is the remediationSchema that checks remediation actions
export const remediationSchema = z.object({ // this line starts an object schema for remediation logs
  action: z.string().min(1), // this line requires a non-empty action name
  notes: z.string().optional(), // this line allows optional free-text notes
});

// API Key validation schemas // this line introduces the two API key schemas below
// This is the createApiKeySchema that checks new key requests
export const createApiKeySchema = z.object({ // this line starts an object schema for creating a key
  name: z.string().min(1).max(100), // this line requires a key name from 1 to 100 chars
  expiresInDays: z.coerce.number().int().min(1).max(3650).optional(), // max 10 years // this line allows optional expiry in days up to 10 years
});

// This is the apiKeyParamsSchema that checks the :id URL param
export const apiKeyParamsSchema = z.object({ // this line starts an object schema for URL params
  id: z.string().uuid(), // this line requires the id param to be a valid UUID
});
