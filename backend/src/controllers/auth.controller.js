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
  generateInviteCode,
  hashApiKey,
} from "../services/auth.service.js";
// This imports authentication-related functions.
// Rather than putting password hashing and JWT logic directly inside this controller, the project has separated it into:

import { ok, created } from "../utils/apiResponse.js";
// These are response helper functions.
import { asyncHandler } from "../utils/asyncHandler.js";

// Now we get to the first major function. It Creates a Export named register
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, organizationName, inviteCode } =
    req.validated; // Here request.validate is used to validate the request body against the registerSchema
  const exists = await pool.query("SELECT id FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  if (exists.rows.length > 0) //PostgreSQL returns rows in an array
    return res //means the request conflicts with existing data.
      .status(409)
      .json({ success: false, error: "Email already registered" });// it sends a JSON response with a status code of 409 (Conflict)

  // --- Join flow: employee registers with an invite code shared by their admin ---
  // They land inside that org as EMPLOYEE — no new workspace is created.
  if (inviteCode) {
    const org = await pool.query(
      'SELECT id, name, slug FROM organizations WHERE UPPER(invite_code) = UPPER($1)',
      [inviteCode.trim()],
    );
    if (org.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid invite code. Ask your admin for the current code.' });
    }
    const organization = org.rows[0];
    const hash = await hashPassword(password);
    const u = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, organization_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, first_name, last_name, organization_id`,
      [email.toLowerCase(), hash, firstName, lastName, organization.id],
    );
    const user = u.rows[0];
    await pool.query(
      `INSERT INTO organization_members (user_id, organization_id, role) VALUES ($1,$2,'EMPLOYEE')
       ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
      [user.id, organization.id],
    );
    const refresh = signRefreshToken();
    await pool.query(
      `INSERT INTO sessions (id, user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
      [user.id, refresh, req.ip, req.headers["user-agent"] || null],
    );
    const token = signAccessToken({ userId: user.id, orgId: organization.id });
    const { env } = await import("../config/env.js");
    res.cookie(env.tokenCookie, token, cookieOptions());
    return created(res, {
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name },
      organization,
      role: "EMPLOYEE",
      token,
    }, `Joined ${organization.name} as EMPLOYEE`);
  }

  // --- Owner flow: no invite code, so create a brand-new workspace ---
  if (!organizationName) {
    return res.status(400).json({ success: false, error: 'Organization name is required when registering without an invite code' });
  }
      // If the email is unique, we proceed to create the user and organization
  const data = await withTransaction(async (c) => {
    const org = await c.query( // We use a transaction to ensure that the organization and user are created atomically
      `INSERT INTO organizations (name, slug, invite_code) VALUES ($1, $2, $3) RETURNING id, name, slug, invite_code`, // new orgs get a join code the owner can share
      [organizationName, slugify(organizationName), generateInviteCode()], // this line generates a slug from the organization name
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

  // Check permissions — OWNER/ADMIN manage keys; employees (MEMBER/EMPLOYEE) are read-only
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

  // Check permissions — every org member (OWNER/ADMIN/MEMBER/EMPLOYEE) may view key metadata
  if (!['OWNER', 'ADMIN', 'MEMBER', 'EMPLOYEE'].includes(role)) {
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

  // Check permissions — OWNER/ADMIN manage keys; employees (MEMBER/EMPLOYEE) are read-only
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
// Check permissions — every org member (OWNER/ADMIN/MEMBER/EMPLOYEE) may view key metadata
  if (!['OWNER', 'ADMIN', 'MEMBER', 'EMPLOYEE'].includes(role)) {
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
 * Add a member to the caller's organization. OWNER/ADMIN only.
 * The new user logs in with this email+password and lands in YOUR org
 * with the designated role — no new workspace is created.
 * Guards: ADMINs may only add ADMIN/employee-level roles; only an OWNER
 * may grant OWNER. Email must be globally unique (login is by email).
 */
export const addMember = asyncHandler(async (req, res) => {
  const { organizationId, role: callerRole } = req.user;
  if (!['OWNER', 'ADMIN'].includes(callerRole)) {
    return res.status(403).json({
      success: false,
      error: 'Only OWNER or ADMIN can add members',
    });
  }
  const { email, password, firstName, lastName, role } = req.validated;
  const normalized = email.toLowerCase();
  // Only an OWNER may create another OWNER; ADMINs can add ADMINs and employees
  if (role === 'OWNER' && callerRole !== 'OWNER') {
    return res.status(403).json({
      success: false,
      error: 'Only OWNER can grant the OWNER role',
    });
  }
  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [normalized]);
  if (exists.rows.length > 0) {
    return res.status(409).json({ success: false, error: 'Email already registered' });
  }
  const hash = await hashPassword(password);
  const u = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, organization_id)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, email, first_name, last_name, organization_id, created_at`,
    [normalized, hash, firstName, lastName, organizationId],
  );
  const user = u.rows[0];
  await pool.query(
    `INSERT INTO organization_members (user_id, organization_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
    [user.id, organizationId, role],
  );
  return created(res, {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role,
    createdAt: user.created_at,
  }, `${email} added to your organization as ${role}`);
});

/**
 * Change a member's role. OWNER can set any role; ADMIN can move people
 * between employee-level roles (MEMBER/EMPLOYEE) and demote ADMINs they
 * manage — but cannot grant OWNER/ADMIN or touch OWNERs. You cannot change
 * your own role (prevents accidentally locking yourself out of admin).
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
  const callerRole = req.user.role;
  if (!['OWNER', 'ADMIN'].includes(callerRole)) {
    return res.status(403).json({
      success: false,
      error: 'Only OWNER or ADMIN can change member roles',
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
  // Look up the target's current role so ADMINs can't escalate or touch OWNERs/ADMINs
  const target = await pool.query(
    `SELECT u.id, u.email, COALESCE(om.role, 'OWNER') AS role
     FROM users u
     LEFT JOIN organization_members om ON om.user_id = u.id AND om.organization_id = u.organization_id
     WHERE u.id = $1 AND u.organization_id = $2`,
    [id, req.user.organizationId],
  );
  if (target.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Member not found in your organization',
    });
  }
  const targetRole = target.rows[0].role;
  if (callerRole === 'ADMIN') {
    // ADMINs manage employees only: no granting OWNER/ADMIN, no touching OWNER/ADMIN accounts
    if (['OWNER', 'ADMIN'].includes(role) || ['OWNER', 'ADMIN'].includes(targetRole)) {
      return res.status(403).json({
        success: false,
        error: 'ADMINs can only manage employee (MEMBER/EMPLOYEE) roles — OWNER changes need an OWNER',
      });
    }
  }
  await pool.query(
    `INSERT INTO organization_members (user_id, organization_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
    [id, req.user.organizationId, role],
  );
  return ok(res, { id, email: target.rows[0].email, role }, 'Role updated');
});

// ============ Invite code (admin invites employees to join) ============

/** Ensure the org has a join code, generating one lazily for older workspaces. */
async function ensureInviteCode(organizationId) {
  const r = await pool.query('SELECT invite_code FROM organizations WHERE id = $1', [organizationId]);
  if (r.rows.length === 0) return null;
  if (r.rows[0].invite_code) return r.rows[0].invite_code;
  const code = generateInviteCode();
  await pool.query('UPDATE organizations SET invite_code = $1 WHERE id = $2', [code, organizationId]);
  return code;
}

/**
 * Get this workspace's invite code. OWNER/ADMIN only.
 * Share it with employees — they paste it on the Register page and land
 * in this org as EMPLOYEE.
 */
export const getInviteCode = asyncHandler(async (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Only OWNER or ADMIN can view the invite code' });
  }
  const inviteCode = await ensureInviteCode(req.user.organizationId);
  return ok(res, { inviteCode, organization: req.user.organization });
});

/**
 * Rotate (replace) the invite code. OWNER/ADMIN only.
 * Old codes stop working immediately — use when a code leaks.
 */
export const rotateInviteCode = asyncHandler(async (req, res) => {
  if (!['OWNER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Only OWNER or ADMIN can rotate the invite code' });
  }
  const inviteCode = generateInviteCode();
  await pool.query('UPDATE organizations SET invite_code = $1 WHERE id = $2', [inviteCode, req.user.organizationId]);
  return ok(res, { inviteCode }, 'Invite code rotated. Share the new code with your team.');
});

// ============ Workspace activity (admin watches what changes) ============

/**
 * Recent activity across the caller's organization: latest incidents
 * (with assignees) and latest remediation actions (with author + incident).
 * Any org member can view; admins use it to watch employee work.
 */
export const getActivity = asyncHandler(async (req, res) => {
  const orgId = req.user.organizationId;
  const incidents = (await pool.query(
    `SELECT i.id, i.title, i.status, i.severity, i.created_at, u.email AS assignee_email
     FROM incidents i LEFT JOIN users u ON u.id = i.assignee_id
     WHERE i.organization_id = $1
     ORDER BY i.created_at DESC LIMIT 10`,
    [orgId],
  )).rows;
  const remediations = (await pool.query(
    `SELECT r.id, r.action, r.notes, r.created_at, u.email AS author_email, i.title AS incident_title
     FROM remediation_logs r
     JOIN incidents i ON i.id = r.incident_id
     JOIN users u ON u.id = r.user_id
     WHERE i.organization_id = $1
     ORDER BY r.created_at DESC LIMIT 10`,
    [orgId],
  )).rows;
  return ok(res, { incidents, remediations });
});
