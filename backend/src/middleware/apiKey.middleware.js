// This file is an API Key authentication middleware. It contains the backend logic for:
// Reading the API key from the Authorization header
// Checking the key format
// Hashing the key and looking it up in the database
// Checking if the key is revoked or expired
// Attaching the organization to the request object
// It sits between the HTTP request and your ingestion route handlers.

import { pool } from '../config/db.js';
// The pool manages database connections for you.

import { hashApiKey } from '../services/auth.service.js';
// This imports the hash function so raw keys are never compared directly.

// Now we get to the first major function. It Creates a Export named authenticateApiKey
export async function authenticateApiKey(req, res, next) {
  try { // this line starts a try block so errors can be caught
    const authHeader = req.headers.authorization; // this line gets the Authorization header from the request

    // Check if Authorization header exists and uses Bearer scheme
    if (!authHeader || !authHeader.startsWith('Bearer ')) { // this line checks that the header exists and looks like Bearer ...
      return res.status(401).json({ // this line starts the Unauthorized response
        success: false, // this line says the request did not succeed
        error: 'API key required. Use: Authorization: Bearer cs_live_...' // this line tells the caller how to send the key
      }); // this line ends the JSON response
    }

    // Extract the API key from the header
    const providedKey = authHeader.replace('Bearer ', '').trim(); // this line removes Bearer and spaces to get just the key

    // Validate key format - must start with cs_live_
    if (!providedKey.startsWith('cs_live_')) { // this line checks the key has the right prefix
      return res.status(401).json({ // this line starts the invalid format response
        success: false, // this line says the request did not succeed
        error: 'Invalid API key format. Keys must start with cs_live_' // this line explains the right key format
      }); // this line ends the JSON response
    }

    // Hash the provided key for secure comparison (never store raw keys)
    const keyHash = hashApiKey(providedKey); // this line hashes the key for safe comparison
    // Use key prefix (first 12 chars) for efficient database lookup
    const keyPrefix = providedKey.slice(0, 12); // this line gets the first 12 chars to help find the key fast

    // Look up the API key in database
    const result = await pool.query( // this line queries the database for the API key
      `SELECT ak.id, ak.name, ak.organization_id, ak.expires_at, ak.revoked_at,
              o.name AS org_name, o.slug AS org_slug
       FROM api_keys ak
       JOIN organizations o ON o.id = ak.organization_id
       WHERE ak.key_hash = $1 AND ak.key_prefix = $2`, // this line holds the SQL that finds the key by hash and prefix
      [keyHash, keyPrefix] // this line passes the hash and prefix into the SQL
    ); // this line ends the database query

    // If key not found, return 401
    if (result.rows.length === 0) { // this line checks if no key was found
      return res.status(401).json({ // this line starts the invalid key response
        success: false, // this line says the request did not succeed
        error: 'Invalid API key' // this line says the key is not valid
      }); // this line ends the JSON response
    }

    const apiKey = result.rows[0]; // this line gets the first API key row from the database

    // Check if key has been revoked
    if (apiKey.revoked_at) { // this line checks if the key was revoked
      return res.status(401).json({ // this line starts the revoked response
        success: false, // this line says the request did not succeed
        error: 'API key has been revoked' // this line says the key was revoked
      }); // this line ends the JSON response
    }

    // Check if key has expired
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) { // this line checks if the key is past its expiry date
      return res.status(401).json({ // this line starts the expired response
        success: false, // this line says the request did not succeed
        error: 'API key has expired' // this line says the key has expired
      }); // this line ends the JSON response
    }

    // Update last_used_at timestamp for audit trail
    await pool.query( // this line updates the database to record this use
      `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, // this line holds the SQL that stamps the use time
      [apiKey.id] // this line passes the key id into the SQL
    ); // this line ends the database update

    // Attach organization info to request (similar to JWT auth)
    req.apiKey = { // this line attaches the API key info to the request
      id: apiKey.id, // this line saves the key id
      name: apiKey.name, // this line saves the key name
      organizationId: apiKey.organization_id, // this line saves the organization id
      organization: { // this line starts the organization info
        id: apiKey.organization_id, // this line saves the organization id again
        name: apiKey.org_name, // this line saves the organization name
        slug: apiKey.org_slug // this line saves the organization slug
      }, // this line ends the organization info
    }; // this line ends the req.apiKey object

    // For compatibility with existing controllers that expect req.user
    req.user = { // this line makes a req.user so old code still works
      id: `api-key-${apiKey.id}`, // this line makes a fake user id from the key id
      organizationId: apiKey.organization_id, // this line saves the organization id
      organization: { // this line starts the organization info
        id: apiKey.organization_id, // this line saves the organization id again
        name: apiKey.org_name, // this line saves the organization name
        slug: apiKey.org_slug // this line saves the organization slug
      }, // this line ends the organization info
      role: 'API_KEY', // this line marks the role as API_KEY
      isApiKey: true, // this line flags that this request used an API key
    }; // this line ends the req.user object

    next(); // this line moves on to the next middleware or route
  } catch (err) { // this line catches any unexpected error
    next(err); // this line sends the error to the Express error handler
  }
}

// This is the optionalApiKey function that lets requests pass with or without a key
export async function optionalApiKey(req, res, next) {
  const authHeader = req.headers.authorization; // this line gets the Authorization header from the request

  // If no Authorization header, just continue
  if (!authHeader || !authHeader.startsWith('Bearer ')) { // this line checks if no Bearer header was sent
    return next(); // this line moves on without checking a key
  }

  // If header exists, validate it
  return authenticateApiKey(req, res, next); // this line runs the full API key check
}
