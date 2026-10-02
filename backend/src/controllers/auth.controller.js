// This file is an authentication controller. It contains the backend logic for:
// Registering a new user
// Logging in
// Getting the current session/user
// Logging out
// API Key management (create, list, revoke)
// It sits between the HTTP request and your database/authentication services.

import { pool, withTransaction } from "../config/db.js";
// The pool manages database connections for you.

import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  slugify,
  cookieOptions,
  generateApiKey,
  hashApiKey,
} from "../services/auth.service.js";
// This imports authentication-related functions.
// Rather than putting password hashing and JWT logic directly inside this controller, the project has separated it into:

import { ok, created } from "../utils/apiResponse.js";
// These are response helper functions.
import { asyncHandler } from "../utils/asyncHandler.js";

// Now we get to the first major function. It Creates a Export named register
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, organizationName } =
    req.validated; // Here request.validate is used to validate the request body against the registerSchema
  const exists = await pool.query("SELECT id FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  if (exists.rows.length > 0) //PostgreSQL returns rows in an array
    return res //means the request conflicts with existing data.
      .status(409)
      .json({ success: false, error: "Email already registered" });// it sends a JSON response with a status code of 409 (Conflict)

      // If the email is unique, we proceed to create the user and organization
  const data = await withTransaction(async (c) => {
    const org = await c.query( // We use a transaction to ensure that the organization and user are created atomically
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, name, slug`, // this line inserts the organization into the database
      [organizationName, slugify(organizationName)], // this line generates a slug from the organization name
    );
    const organization = org.rows[0];// this line gets the organization from the database
    const hash = await hashPassword(password);// this line hashes the password
    const u = await c.query(// this line inserts the user into the database
      `INSERT INTO users (email, password_hash, first_name, last_name, organization_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, first_name, last_name, organization_id`,
      [email.toLowerCase(), hash, firstName, lastName, organization.id], // this line generates a slug from the organization name
    );
    const user = u.rows[0];// this line gets the user from the database
    await c.query(// this line inserts the user into the organization
      `INSERT INTO organization_members (user_id, organization_id, role) VALUES ($1,$2,'OWNER')`,
      [user.id, organization.id],
    );// this line inserts the user into the organization
    const refresh = signRefreshToken();// this line generates a refresh token
    await c.query(    // this line inserts the refresh token into the database
      `INSERT INTO sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
      [user.id, refresh, req.ip, req.headers["user-agent"] || null], // this line generates a refresh token
    );
    return { organization, user, refresh }; // this line returns the organization, user, and refresh token
  });

  const token = signAccessToken({ // this line generates an access token
    userId: data.user.id, 
    orgId: data.organization.id,
  });
  res.cookie( // this line sets a cookie
    (await import("../config/env.js")).env.tokenCookie,// this line gets the token cookie
    token,
    cookieOptions(),// this line sets the cookie options
  );
  return created(// this line returns a created response
    res,
    {
      user: { // this line returns the user
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.first_name,
        lastName: data.user.last_name,
      },
      organization: data.organization,
      role: "OWNER",
      token,
    },
    "Registered",
  );
});
// This is the login function that authenticates a user
export const login = asyncHandler(async (req, res) => { // this line defines the login function
  const { email, password } = req.validated; // this line gets the email and password from the request
  const r = await pool.query( // this line queries the database
    `SELECT u.*, COALESCE(om.role,'OWNER') AS role, o.name AS org_name, o.slug AS org_slug
     FROM users u JOIN organizations o ON o.id = u.organization_id
     LEFT JOIN organization_members om ON om.user_id = u.id AND om.organization_id = o.id
     WHERE u.email = $1`,
    [email.toLowerCase()], // this line queries the database
  );
  // this line checks if the user exists
  if (r.rows.length === 0)
    return res// this line returns a response
      .status(401)
      .json({ success: false, error: "Invalid credentials" });
  const row = r.rows[0]; // this line gets the user
  if (!(await verifyPassword(password, row.password_hash))) {
    return res // this line returns a response
      .status(401)
      .json({ success: false, error: "Invalid credentials" });
  }
  // this line signs the access token
  const token = signAccessToken({ userId: row.id, orgId: row.organization_id });
  const refresh = signRefreshToken(); // this line signs the refresh token
  await pool.query(
    `INSERT INTO sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
    [row.id, refresh, req.ip, req.headers["user-agent"] || null],
  ); // this line signs the refresh token
  await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [ // this line signs the refresh token
    row.id,
  ]);
  const { env } = await import("../config/env.js");
  res.cookie(env.tokenCookie, token, cookieOptions());
  return ok(res, {
    user: {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
    },
    organization: {
      id: row.organization_id,
      name: row.org_name,
      slug: row.org_slug,
    },
    role: row.role,
    token,
    refreshToken: refresh,
  });
});
// This is the session function that returns the user
export const session = asyncHandler(async (req, res) => ok(res, req.user));
// This is the logout function that logs out the user
export const logout = asyncHandler(async (req, res) => {
  const { env } = await import("../config/env.js");
  res.clearCookie(env.tokenCookie, { path: "/" });
  return ok(res, null, "Logged out");
});

// ============ API Key Management ============

/**
 * Create a new API key for the authenticated user's organization
 * Requires OWNER or ADMIN role
 */
export const createApiKey = asyncHandler(async (req, res) => {
  const { name, expiresInDays } = req.validated;
  const { organizationId, id: userId, role } = req.user;

  // Check permissions
  if (!['OWNER', 'ADMIN'].includes(role)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Only OWNER or ADMIN can create API keys' 
    });
  }

  const { key, keyHash, keyPrefix } = generateApiKey();
  
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const result = await pool.query(
    `INSERT INTO api_keys (name, key_hash, key_prefix, organization_id, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, key_prefix, organization_id, expires_at, created_at`,
    [name, keyHash, keyPrefix, organizationId, userId, expiresAt]
  );

  const apiKey = result.rows[0];

  // Return the full key ONLY ONCE - it cannot be retrieved again
  return created(res, {
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.key_prefix,
    key: key, // Only returned on creation!
    organizationId: apiKey.organization_id,
    expiresAt: apiKey.expires_at,
    createdAt: apiKey.created_at,
  }, 'API key created. Save the key now - it cannot be shown again.');
});

/**
 * List all API keys for the authenticated user's organization
 * Does NOT return the actual keys, only metadata
 */
export const listApiKeys = asyncHandler(async (req, res) => {
  const { organizationId, role } = req.user;

  // Check permissions
  if (!['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Insufficient permissions' 
    });
  }

  const result = await pool.query(
    `SELECT id, name, key_prefix, last_used_at, expires_at, revoked_at, created_at
     FROM api_keys
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [organizationId]
  );

  return ok(res, result.rows);
});

/**
 * Revoke an API key
 */
export const revokeApiKey = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { organizationId, role } = req.user;

  // Check permissions
  if (!['OWNER', 'ADMIN'].includes(role)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Only OWNER or ADMIN can revoke API keys' 
    });
  }

  const result = await pool.query(
    `UPDATE api_keys 
     SET revoked_at = NOW() 
     WHERE id = $1 AND organization_id = $2 AND revoked_at IS NULL
     RETURNING id, name, key_prefix`,
    [id, organizationId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ 
      success: false, 
      error: 'API key not found or already revoked' 
    });
  }

  return ok(res, result.rows[0], 'API key revoked');
});

/**
 * Get API key details (without the actual key)
 */
// This is the getApiKey function
export const getApiKey = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { organizationId, role } = req.user;
// Check permissions
  if (!['OWNER', 'ADMIN', 'MEMBER'].includes(role)) {
    return res.status(403).json({ 
      success: false, 
      error: 'Insufficient permissions' 
    });
  }
// Get the API key
  const result = await pool.query(
    `SELECT id, name, key_prefix, last_used_at, expires_at, revoked_at, created_at
     FROM api_keys
     WHERE id = $1 AND organization_id = $2`,
    [id, organizationId]
  );
// If the API key doesn't exist, return an error
  if (result.rows.length === 0) {
    return res.status(404).json({ 
      success: false, 
      error: 'API key not found' 
    });
  }

  return ok(res, result.rows[0]);
});

// ============ Organization Members (Admin) ============

/**
 * List all members of the authenticated user's organization with roles.
 * Any authenticated member can view; role changes are OWNER-only (below).
 */
export const listMembers = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.last_login_at, u.created_at,
            COALESCE(om.role, 'OWNER') AS role
     FROM users u
     LEFT JOIN organization_members om ON om.user_id = u.id AND om.organization_id = u.organization_id
     WHERE u.organization_id = $1
     ORDER BY u.created_at ASC`,
    [req.user.organizationId],
  );
  return ok(res, result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  })));
});

/**
 * Change a member's role. OWNER-only, and you cannot change your own role
 * (prevents accidentally locking yourself out of admin).
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({
      success: false,
      error: 'Only OWNER can change member roles',
    });
  }
  const { id } = req.params;
  const { role } = req.validated;
  if (id === req.user.id) {
    return res.status(400).json({
      success: false,
      error: 'You cannot change your own role',
    });
  }
  const target = await pool.query(
    'SELECT id, email FROM users WHERE id = $1 AND organization_id = $2',
    [id, req.user.organizationId],
  );
  if (target.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Member not found in your organization',
    });
  }
  await pool.query(
    `INSERT INTO organization_members (user_id, organization_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
    [id, req.user.organizationId, role],
  );
  return ok(res, { id, email: target.rows[0].email, role }, 'Role updated');
});
